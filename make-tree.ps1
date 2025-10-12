# Simple Tree Generator
Write-Host "Generating tree structure..."

# Get directory listing excluding large folders
$tree = Get-ChildItem -Recurse -Name -Exclude node_modules,dist,build,.git,.next | Out-String

# Save to file
$tree | Out-File "PROJECT-TREE.txt" -Encoding UTF8

Write-Host "Done! Check PROJECT-TREE.txt"

