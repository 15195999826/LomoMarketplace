<#
.SYNOPSIS
    Call Gemini CLI in headless mode with proper environment setup.

.DESCRIPTION
    This script sets up the required environment variables (user profile, proxy)
    and calls Gemini CLI in headless mode, returning JSON output.

.PARAMETER Prompt
    The prompt to send to Gemini.

.PARAMETER OutputFormat
    Output format: json (default), text, or stream-json.

.PARAMETER Model
    Model to use (default: gemini-3-pro-preview).

.PARAMETER Yolo
    Auto-approve all actions (use with caution).

.PARAMETER WorkingDirectory
    Working directory for Gemini to operate in. Defaults to current directory.

.EXAMPLE
    .\call_gemini.ps1 -Prompt "Explain this code"
    .\call_gemini.ps1 -Prompt "Search for React hooks" -Model "gemini-2.5-flash"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$Prompt,

    [ValidateSet("json", "text", "stream-json")]
    [string]$OutputFormat = "json",

    [string]$Model = "gemini-3-flash-preview",

    [switch]$Yolo,

    [string]$WorkingDirectory
)

# Set environment variables for authentication
$env:USERPROFILE = "C:\Users\37065"
$env:APPDATA = "C:\Users\37065\AppData\Roaming"
$env:HOME = "C:\Users\37065"

# Set proxy
$env:http_proxy = "http://127.0.0.1:7890"
$env:https_proxy = "http://127.0.0.1:7890"
$env:HTTP_PROXY = "http://127.0.0.1:7890"
$env:HTTPS_PROXY = "http://127.0.0.1:7890"

# Build command arguments
$geminiArgs = @("-p", $Prompt, "--output-format", $OutputFormat, "-m", $Model)

if ($Yolo) {
    $geminiArgs += "-y"
}

# Change to working directory if specified
if ($WorkingDirectory -and (Test-Path $WorkingDirectory)) {
    Push-Location $WorkingDirectory
}

try {
    # Log the call
    Write-Host "========== GEMINI CALL ==========" -ForegroundColor Cyan
    Write-Host "Model: $Model"
    Write-Host "Prompt: $Prompt"
    Write-Host ""

    # Call Gemini and capture output
    $output = & gemini @geminiArgs 2>&1

    # Separate stdout and stderr
    $stdout = $output | Where-Object { $_ -isnot [System.Management.Automation.ErrorRecord] }
    $stderr = $output | Where-Object { $_ -is [System.Management.Automation.ErrorRecord] }

    Write-Host "========== GET GEMINI RESPONSE ==========" -ForegroundColor Green

    # Output stdout (the JSON response)
    $stdout | ForEach-Object { $_.ToString() }

    # Exit with gemini's exit code
    exit $LASTEXITCODE
}
finally {
    # Restore original directory
    if ($WorkingDirectory -and (Test-Path $WorkingDirectory)) {
        Pop-Location
    }
}
