# Generate Project Tree Structure
# Excludes: node_modules, .git, dist, build

$output = @()
$output += "PROJECT STRUCTURE - XspensesAI"
$output += "=" * 80
$output += ""

# Get all items recursively, excluding unwanted directories
$items = Get-ChildItem -Recurse -Force | Where-Object {
    $_.FullName -notmatch 'node_modules' -and
    $_.FullName -notmatch '\.git\\' -and
    $_.FullName -notmatch '\\dist\\' -and
    $_.FullName -notmatch '\\build\\' -and
    $_.FullName -notmatch '\\.vscode' -and
    $_.FullName -notmatch '\\.next'
}

# Group by directory for better organization
$currentDir = Get-Location
foreach ($item in $items) {
    $relativePath = $item.FullName.Replace($currentDir.Path + "\", "")
    
    # Calculate depth for indentation
    $depth = ($relativePath.Split('\').Count - 1)
    $indent = "  " * $depth
    
    if ($item.PSIsContainer) {
        $output += "$indent📁 $($item.Name)/"
    } else {
        $output += "$indent📄 $($item.Name)"
    }
}

# Save to file
$output | Out-File -FilePath "PROJECT-TREE.txt" -Encoding UTF8

Write-Host "✅ Tree generated successfully!"
Write-Host "📄 Saved to: PROJECT-TREE.txt"
Write-Host ""
Write-Host "You can now open PROJECT-TREE.txt and copy everything!"

