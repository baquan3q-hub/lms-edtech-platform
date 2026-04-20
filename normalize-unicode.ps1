$dir = $PSScriptRoot
$files = @("tieu-luan-lms.html", "user-stories.md")
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
foreach ($f in $files) {
    $filePath = Join-Path $dir $f
    if (Test-Path $filePath) {
        $content = [System.IO.File]::ReadAllText($filePath)
        $normalized = $content.Normalize([System.Text.NormalizationForm]::FormC)
        [System.IO.File]::WriteAllText($filePath, $normalized, $utf8NoBom)
        Write-Host "Normalized: $f"
    }
}
Write-Host "All done!"
