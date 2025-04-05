# 🔧 Need to Fix

1.  **PowerShell `curl` Syntax:** The standard `curl` command provided for testing needs adjustment for PowerShell's `Invoke-WebRequest` alias. The `-H` parameter requires a hashtable (`@{'Header'='Value'}`) and `-d` becomes `-Body`. 