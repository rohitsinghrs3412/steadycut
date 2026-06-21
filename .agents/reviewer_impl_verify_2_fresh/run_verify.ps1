Write-Host "Starting robust verification pipeline..."
$logPath = "c:\Users\Rohit Singh\Desktop\testing\.agents\reviewer_impl_verify_2_fresh"

# Function to get process details
function Get-NodeProcesses {
    return Get-CimInstance Win32_Process -Filter "Name = 'node.exe'"
}

# Wait loop for active conflicting processes
Write-Host "Checking for active builds or tests..."
while ($true) {
    $procs = Get-NodeProcesses
    $hasActiveBuildOrTest = $false
    $leftoverDevPids = @()

    foreach ($p in $procs) {
        $cmd = $p.CommandLine
        if ($cmd -like "*next*build*" -or $cmd -like "*playwright*" -or $cmd -like "*npm*run*build*") {
            $hasActiveBuildOrTest = $true
        }
        if ($cmd -like "*next*dev*" -or $cmd -like "*start-server*") {
            $leftoverDevPids += $p.ProcessId
        }
    }

    if ($hasActiveBuildOrTest) {
        Write-Host "Active build or test process detected. Waiting 5 seconds..."
        Start-Sleep -Seconds 5
        continue
    }

    # If no active builds or tests, we can kill any leftover dev servers
    if ($leftoverDevPids.Count -gt 0) {
        Write-Host "No active tests running, but found leftover dev servers (PIDs: $leftoverDevPids). Killing them..."
        foreach ($pid in $leftoverDevPids) {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 2
    }

    break
}

Write-Host "Workspace clean. Removing build lock..."
Remove-Item -Path "c:\Users\Rohit Singh\Desktop\testing\.next\lock" -Force -ErrorAction SilentlyContinue

Write-Host "Running build..."
$buildStart = Get-Date
npm run build > "$logPath\build.log" 2>&1
$buildExit = $LASTEXITCODE
$buildEnd = Get-Date
$buildDuration = ($buildEnd - $buildStart).TotalSeconds
Write-Host "Build finished in $buildDuration seconds. Exit code: $buildExit"

Write-Host "Running unit tests..."
npm run test > "$logPath\unit_tests.log" 2>&1
$unitExit = $LASTEXITCODE
Write-Host "Unit tests finished. Exit code: $unitExit"

Write-Host "Running Playwright E2E tests..."
npx playwright test --project="Chromium Mobile (Galaxy S9+)" > "$logPath\playwright.log" 2>&1
$e2eExit = $LASTEXITCODE
Write-Host "Playwright tests finished. Exit code: $e2eExit"

# Write execution summary to a json file
$summary = @{
    BuildExit = $buildExit
    BuildDurationSeconds = $buildDuration
    UnitExit = $unitExit
    E2EExit = $e2eExit
} | ConvertTo-Json
$summary | Out-File -FilePath "$logPath\verify_summary.json" -Force
