#!/bin/bash

# Target path for the executable
TARGET="/usr/bin/jccm"

# Check if the target is a symbolic link and remove it if it is
if [ -L "$TARGET" ]; then
    rm -f "$TARGET"
fi

# Create a new executable file with the required command
cat << 'EOF' > "$TARGET"
#!/bin/bash
"/usr/lib/jccm/Juniper Cloud Connection Manager" --no-sandbox > /dev/null 2>&1
EOF

# Ensure the script is executable
chmod +x "$TARGET"
