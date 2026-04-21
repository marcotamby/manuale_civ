
$path = "c:\Users\marco\OneDrive\Desktop\manualeciv\src\components\AdminDashboardModal.tsx"
$content = Get-Content $path

# Line-by-line replacement based on my previous successful edit of line 820
# Line 821 (index 820)
$content[820] = $content[820] -replace 'gap-3', 'gap-4'
# Line 822 (index 821)
$content[821] = $content[821] -replace 'w-10 h-10', 'w-12 h-12' -replace 'text-lg', 'text-xl'
$content[821] += " shrink-0"
# Line 825 (index 824)
$content[824] = $content[824] -replace 'min-w-0"', 'min-w-0 flex-1"'

# Now the harder part: moving the permissions div.
# We want to replace lines 871 to 910 with a new structure.
# But let's just do it surgical first.

# Change lines 866-867 to block and better rank
$content[865] = $content[865] -replace 'truncate"', 'truncate block"'
# Replace rank line
$content[866] = "                                   <div className=`"flex items-center gap-2 mt-0.5`">"
$content += "                                      <span className=`"text-[10px] font-bold text-blue-400/70 border border-blue-500/20 px-1.5 py-0.5 rounded bg-blue-500/5`">{u.rank || 'Unranked'}</span>"
# This is getting messy because I'm adding lines.

# I'll stop and just use the full file overwrite. It is the only reliable way.
