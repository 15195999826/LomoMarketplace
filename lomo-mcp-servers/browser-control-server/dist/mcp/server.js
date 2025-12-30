/**
 * Browser Control MCP Server
 * 提供浏览器控制工具给 Claude Code
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { createBrowserCommand, } from "@lomo/browser-bridge";
export class BrowserControlMCPServer {
    server;
    bridgeServer = null;
    constructor() {
        this.server = new Server({
            name: "browser-control",
            version: "0.1.0",
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.registerHandlers();
    }
    /**
     * 设置 Bridge Server 引用
     */
    setBridgeServer(bridgeServer) {
        this.bridgeServer = bridgeServer;
    }
    /**
     * 发送命令到浏览器并等待结果
     */
    async sendToBrowser(command) {
        if (!this.bridgeServer) {
            throw new Error("Bridge Server 未初始化");
        }
        if (!this.bridgeServer.isBrowserConnected()) {
            throw new Error("浏览器未连接，请先打开 Chrome 插件");
        }
        return this.bridgeServer.sendBrowserCommand(command);
    }
    /**
     * 注册 MCP 处理器
     */
    registerHandlers() {
        // 列出可用工具
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: "browser_screenshot",
                        description: "截取当前浏览器页面的截图，返回 base64 编码的图片",
                        inputSchema: {
                            type: "object",
                            properties: {
                                tabId: {
                                    type: "number",
                                    description: "标签页 ID（可选，默认为当前活动标签页）",
                                },
                            },
                        },
                    },
                    {
                        name: "browser_click",
                        description: "点击指定位置或元素。可以使用坐标或元素引用（ref）",
                        inputSchema: {
                            type: "object",
                            properties: {
                                coordinate: {
                                    type: "array",
                                    items: { type: "number" },
                                    description: "[x, y] 坐标",
                                },
                                ref: {
                                    type: "string",
                                    description: "元素引用 ID，如 ref_1（通过 browser_read_page 获取）",
                                },
                                button: {
                                    type: "string",
                                    enum: ["left", "right", "middle"],
                                    description: "鼠标按钮，默认 left",
                                },
                                clickCount: {
                                    type: "number",
                                    enum: [1, 2, 3],
                                    description: "点击次数：1=单击, 2=双击, 3=三击",
                                },
                            },
                        },
                    },
                    {
                        name: "browser_type",
                        description: "在当前焦点位置输入文本",
                        inputSchema: {
                            type: "object",
                            properties: {
                                text: {
                                    type: "string",
                                    description: "要输入的文本",
                                },
                            },
                            required: ["text"],
                        },
                    },
                    {
                        name: "browser_scroll",
                        description: "滚动页面",
                        inputSchema: {
                            type: "object",
                            properties: {
                                direction: {
                                    type: "string",
                                    enum: ["up", "down", "left", "right"],
                                    description: "滚动方向",
                                },
                                amount: {
                                    type: "number",
                                    description: "滚动量，默认 3",
                                },
                            },
                            required: ["direction"],
                        },
                    },
                    {
                        name: "browser_read_page",
                        description: "获取页面元素结构（Accessibility Tree）。返回页面上的可交互元素列表，每个元素都有唯一的 ref ID",
                        inputSchema: {
                            type: "object",
                            properties: {
                                filter: {
                                    type: "string",
                                    enum: ["all", "interactive"],
                                    description: "过滤模式：all=所有元素，interactive=只显示可交互元素（默认）",
                                },
                            },
                        },
                    },
                    {
                        name: "browser_key",
                        description: "按下键盘按键，支持组合键如 ctrl+a",
                        inputSchema: {
                            type: "object",
                            properties: {
                                key: {
                                    type: "string",
                                    description: "按键名称，如 Enter, Tab, Backspace, ctrl+a, ctrl+shift+t",
                                },
                                repeat: {
                                    type: "number",
                                    description: "重复次数，默认 1",
                                },
                            },
                            required: ["key"],
                        },
                    },
                    {
                        name: "browser_navigate",
                        description: "导航到指定 URL",
                        inputSchema: {
                            type: "object",
                            properties: {
                                url: {
                                    type: "string",
                                    description: "目标 URL",
                                },
                            },
                            required: ["url"],
                        },
                    },
                ],
            };
        });
        // 处理工具调用
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                switch (name) {
                    case "browser_screenshot":
                        return await this.handleScreenshot(args);
                    case "browser_click":
                        return await this.handleClick(args);
                    case "browser_type":
                        return await this.handleType(args);
                    case "browser_scroll":
                        return await this.handleScroll(args);
                    case "browser_read_page":
                        return await this.handleReadPage(args);
                    case "browser_key":
                        return await this.handleKey(args);
                    case "browser_navigate":
                        return await this.handleNavigate(args);
                    default:
                        throw new Error(`未知工具: ${name}`);
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                return {
                    content: [{ type: "text", text: `错误: ${errorMessage}` }],
                    isError: true,
                };
            }
        });
    }
    async handleScreenshot(args) {
        const command = createBrowserCommand({
            name: "screenshot",
            params: { tabId: args?.tabId },
        });
        const result = (await this.sendToBrowser(command));
        return {
            content: [
                {
                    type: "image",
                    data: result.base64,
                    mimeType: "image/png",
                },
            ],
        };
    }
    async handleClick(args) {
        if (!args?.coordinate && !args?.ref) {
            throw new Error("必须提供 coordinate 或 ref 参数");
        }
        const command = createBrowserCommand({
            name: "click",
            params: {
                coordinate: args.coordinate,
                ref: args.ref,
                button: args.button,
                clickCount: args.clickCount,
            },
        });
        await this.sendToBrowser(command);
        return {
            content: [{ type: "text", text: "点击完成" }],
        };
    }
    async handleType(args) {
        if (!args?.text || typeof args.text !== "string") {
            throw new Error("text 参数必填且必须是字符串");
        }
        const command = createBrowserCommand({
            name: "type",
            params: { text: args.text },
        });
        await this.sendToBrowser(command);
        return {
            content: [{ type: "text", text: `已输入: "${args.text}"` }],
        };
    }
    async handleScroll(args) {
        if (!args?.direction) {
            throw new Error("direction 参数必填");
        }
        const command = createBrowserCommand({
            name: "scroll",
            params: {
                direction: args.direction,
                amount: args.amount,
            },
        });
        await this.sendToBrowser(command);
        return {
            content: [{ type: "text", text: "滚动完成" }],
        };
    }
    async handleReadPage(args) {
        const command = createBrowserCommand({
            name: "read_page",
            params: {
                filter: args?.filter ?? "interactive",
            },
        });
        const result = (await this.sendToBrowser(command));
        return {
            content: [{ type: "text", text: result.content }],
        };
    }
    async handleKey(args) {
        if (!args?.key || typeof args.key !== "string") {
            throw new Error("key 参数必填且必须是字符串");
        }
        const command = createBrowserCommand({
            name: "key",
            params: {
                key: args.key,
                repeat: args.repeat,
            },
        });
        await this.sendToBrowser(command);
        return {
            content: [{ type: "text", text: `已按下: ${args.key}` }],
        };
    }
    async handleNavigate(args) {
        if (!args?.url || typeof args.url !== "string") {
            throw new Error("url 参数必填且必须是字符串");
        }
        const command = createBrowserCommand({
            name: "navigate",
            params: { url: args.url },
        });
        await this.sendToBrowser(command);
        return {
            content: [{ type: "text", text: `已导航到: ${args.url}` }],
        };
    }
    /**
     * 启动 MCP Server（stdio 模式）
     */
    async startStdio() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("[MCP] MCP Server 已启动（stdio 模式）");
    }
    /**
     * 获取 Server 实例（供测试使用）
     */
    getServer() {
        return this.server;
    }
}
//# sourceMappingURL=server.js.map