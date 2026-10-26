Set-Location $PSScriptRoot\..
Write-Host "Serving FSGP Halo sim at http://localhost:8080"
npx --yes serve . -l 8080
