"use client";

import { useState, useCallback, useMemo } from "react";
import type { InkMonListItem } from "@inkmon/core";
import type { IBattleRecord } from "@inkmon/battle";
import { TeamSlot } from "./TeamSlot";
import { InkMonPicker } from "./InkMonPicker";
import { BattleReplayPlayer } from "../battle-replay";
import styles from "./BattleSimulator.module.css";

interface BattleSimulatorProps {
  inkmons: InkMonListItem[];
}

type TeamState = (InkMonListItem | null)[];

interface BattleState {
  status: "idle" | "loading" | "success" | "error";
  replay: IBattleRecord | null;
  log: string | null;
  error: string | null;
}

export function BattleSimulator({ inkmons }: BattleSimulatorProps) {
  const [teamA, setTeamA] = useState<TeamState>([null, null, null]);
  const [teamB, setTeamB] = useState<TeamState>([null, null, null]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<{ team: 'A' | 'B'; index: number } | null>(null);
  const [deterministicMode, setDeterministicMode] = useState(true); // 默认开启，便于验证对照
  const [battle, setBattle] = useState<BattleState>({
    status: "idle",
    replay: null,
    log: null,
    error: null,
  });

  // 获取已选择的 InkMon 名称
  const selectedByTeamA = useMemo(
    () => teamA.filter(Boolean).map(i => i!.name_en),
    [teamA]
  );
  const selectedByTeamB = useMemo(
    () => teamB.filter(Boolean).map(i => i!.name_en),
    [teamB]
  );

  // 计算队伍总属性
  const calcTeamStats = (team: TeamState) => {
    const members = team.filter(Boolean) as InkMonListItem[];
    return {
      count: members.length,
      totalHp: members.reduce((sum, m) => sum + m.base_stats.hp, 0),
      totalAtk: members.reduce((sum, m) => sum + m.base_stats.attack, 0),
      totalDef: members.reduce((sum, m) => sum + m.base_stats.defense, 0),
    };
  };

  const teamAStats = calcTeamStats(teamA);
  const teamBStats = calcTeamStats(teamB);

  // 打开选择器
  const handleSlotClick = (team: 'A' | 'B', index: number) => {
    setActiveSlot({ team, index });
    setPickerOpen(true);
  };

  // 选择 InkMon
  const handleSelectInkmon = useCallback((inkmon: InkMonListItem) => {
    if (!activeSlot) return;

    if (activeSlot.team === 'A') {
      setTeamA(prev => {
        const newTeam = [...prev];
        newTeam[activeSlot.index] = inkmon;
        return newTeam;
      });
    } else {
      setTeamB(prev => {
        const newTeam = [...prev];
        newTeam[activeSlot.index] = inkmon;
        return newTeam;
      });
    }

    setPickerOpen(false);
    setActiveSlot(null);
    setBattle({ status: "idle", replay: null, log: null, error: null });
  }, [activeSlot]);

  // 移除 InkMon
  const handleRemove = (team: 'A' | 'B', index: number) => {
    if (team === 'A') {
      setTeamA(prev => {
        const newTeam = [...prev];
        newTeam[index] = null;
        return newTeam;
      });
    } else {
      setTeamB(prev => {
        const newTeam = [...prev];
        newTeam[index] = null;
        return newTeam;
      });
    }
    setBattle({ status: "idle", replay: null, log: null, error: null });
  };

  // 随机填充两边队伍
  const handleRandomTeams = useCallback(() => {
    // 复制一份可用的 InkMon 列表
    const available = [...inkmons];

    // Fisher-Yates 洗牌算法
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }

    // 取前6个分配给两队
    const newTeamA: TeamState = [
      available[0] ?? null,
      available[1] ?? null,
      available[2] ?? null,
    ];
    const newTeamB: TeamState = [
      available[3] ?? null,
      available[4] ?? null,
      available[5] ?? null,
    ];

    setTeamA(newTeamA);
    setTeamB(newTeamB);
    setBattle({ status: "idle", replay: null, log: null, error: null });
  }, [inkmons]);

  // 运行战斗模拟
  const handleBattle = async () => {
    setBattle({ status: "loading", replay: null, log: null, error: null });

    try {
      const response = await fetch("/api/battle/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamA: selectedByTeamA,
          teamB: selectedByTeamB,
          config: { deterministicMode },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setBattle({
          status: "success",
          replay: data.replay,
          log: data.log ?? null,
          error: null,
        });
      } else {
        setBattle({
          status: "error",
          replay: null,
          log: null,
          error: data.error ?? "战斗模拟失败",
        });
      }
    } catch (err) {
      setBattle({
        status: "error",
        replay: null,
        log: null,
        error: err instanceof Error ? err.message : "网络错误",
      });
    }
  };

  const canBattle = teamAStats.count > 0 && teamBStats.count > 0;

  return (
    <div className={styles.simulator}>
      {/* 队伍配置区域 - 限制宽度居中 */}
      <div className={styles.setupContainer}>
        <div className={styles.battleArea}>
          <div className={styles.teamsContainer}>
            {/* 队伍 A */}
            <div className={styles.team}>
              <div className={styles.teamHeader}>
                <div className={`${styles.teamIcon} ${styles.teamA}`}>A</div>
                <h3 className={styles.teamTitle}>队伍 A</h3>
                <span className={styles.teamStats}>
                  {teamAStats.count}/3 · 总战力 {teamAStats.totalHp + teamAStats.totalAtk + teamAStats.totalDef}
                </span>
              </div>
              <div className={styles.slots}>
                {teamA.map((inkmon, index) => (
                  <TeamSlot
                    key={index}
                    inkmon={inkmon}
                    slotIndex={index}
                    onClick={() => handleSlotClick('A', index)}
                    onRemove={() => handleRemove('A', index)}
                  />
                ))}
              </div>
            </div>

            {/* VS */}
            <div className={styles.vsSection}>
              <div className={styles.vsIcon}>VS</div>
              <button
                className={styles.battleButton}
                onClick={handleBattle}
                disabled={!canBattle || battle.status === "loading"}
              >
                {battle.status === "loading" ? "⏳ 战斗中..." : "⚔️ 开始战斗"}
              </button>
              <button
                className={styles.randomButton}
                onClick={handleRandomTeams}
                disabled={battle.status === "loading"}
              >
                🎲 随机队伍
              </button>
              <label className={styles.deterministicToggle}>
                <input
                  type="checkbox"
                  checked={deterministicMode}
                  onChange={(e) => setDeterministicMode(e.target.checked)}
                />
                <span>固定随机种子</span>
              </label>
            </div>

            {/* 队伍 B */}
            <div className={styles.team}>
              <div className={styles.teamHeader}>
                <div className={`${styles.teamIcon} ${styles.teamB}`}>B</div>
                <h3 className={styles.teamTitle}>队伍 B</h3>
                <span className={styles.teamStats}>
                  {teamBStats.count}/3 · 总战力 {teamBStats.totalHp + teamBStats.totalAtk + teamBStats.totalDef}
                </span>
              </div>
              <div className={styles.slots}>
                {teamB.map((inkmon, index) => (
                  <TeamSlot
                    key={index}
                    inkmon={inkmon}
                    slotIndex={index}
                    onClick={() => handleSlotClick('B', index)}
                    onRemove={() => handleRemove('B', index)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 提示 */}
        {!canBattle && (
          <div className={styles.hint}>
            <span className={styles.hintIcon}>💡</span>
            请为两支队伍各选择至少一只 InkMon 后开始战斗
          </div>
        )}
      </div>

      {/* 战斗结果 - 全宽展示 */}
      {battle.status === "success" && battle.replay && (
        <div className={styles.resultSection}>
          <BattleReplayPlayer replay={battle.replay} />
        </div>
      )}

      {/* 错误信息 */}
      {battle.status === "error" && (
        <div className={styles.resultSection}>
          <h3 className={styles.resultTitle}>❌ 战斗失败</h3>
          <p className={styles.resultMessage}>{battle.error}</p>
        </div>
      )}

      {/* InkMon 选择器 */}
      <InkMonPicker
        isOpen={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setActiveSlot(null);
        }}
        inkmons={inkmons}
        onSelect={handleSelectInkmon}
        selectedByTeamA={selectedByTeamA}
        selectedByTeamB={selectedByTeamB}
        currentTeam={activeSlot?.team || 'A'}
      />
    </div>
  );
}
