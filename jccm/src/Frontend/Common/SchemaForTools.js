// buildCliShortcutSchema.js
export function buildCliShortcutSchema() {
    return {
        title: 'Junos CLI Shortcuts',
        type: 'object',
        required: ['mappings'],
        additionalProperties: false,
        properties: {
            mappings: {
                type: 'array',
                title: 'Shortcuts',
                minItems: 1,
                items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['name', 'commands'],
                    properties: {
                        name: {
                            type: 'string',
                            title: 'Name',
                            description: 'Display name of this shortcut.',
                            $comment: 'markdownDescription: "Display name of this shortcut."',
                            minLength: 1,
                        },
                        commands: {
                            type: 'array',
                            title: 'Commands',
                            description: 'Ordered list of CLI commands to execute.',
                            $comment: 'markdownDescription: "Ordered list of CLI commands. You may include `sleep <ms>` lines (e.g., `sleep 500` pauses for 500 ms). Placeholders like `${device-address}`, `${oc-term-hostname}`, `${jsi-term-hostname}`, and `${outbound-ssh-hostname}` are supported."',
                            minItems: 1,
                            items: {
                                type: 'string',
                                minLength: 1,
                            },
                        },
                    },
                },
            },
        },
    };
}

export const defaultCliShortcutData = `#
# Junos CLI Commands Mapping
# Map named shortcuts to one or more CLI commands.
#
# Format:
#   mappings:
#     - name: <name1>
#       commands:
#         - <CLI command1>
#         - <CLI command2>
#         - sleep 500        # pauses for 500 milliseconds
#
# Placeholders resolved by your app:
#   \${device-address}         - device IP/hostname
#   \${oc-term-hostname}       - OC-term hostname
#   \${jsi-term-hostname}      - JSI-term hostname
#   \${outbound-ssh-hostname}  - OC/JSI term hostname depending on session
#
mappings:
  - name: System Information
    commands:
      - show system information

  - name: Chassis MAC-Addresses
    commands:
      - show chassis mac-addresses

  - name: Hardware Information
    commands:
      - show chassis hardware | no-more

  - name: Name Server Configuration
    commands:
      - show configuration system name-server | display inheritance

  - name: Outbound-SSH Session
    commands:
      - show system connection | match \\\\.2200

  - name: Outbound-SSH Configuration
    commands:
      - show configuration system service outbound-ssh

  - name: Outbound-SSH Config and Session
    commands:
      - show configuration system service outbound-ssh
      - sleep 500
      - show system connection | match \\\\.2200

  - name: Route to Device Address
    commands:
      - show route \${device-address}

  - name: Route to outbound-ssh target host
    commands:
      - show route \${outbound-ssh-hostname}

  - name: Ping outbound-ssh target host
    commands:
      - ping \${outbound-ssh-hostname} inet count 3 wait 1

  - name: Telnet to outbound-ssh target host
    commands:
      - telnet \${outbound-ssh-hostname} inet port 2200
`;




export function buildConfigShortcutSchema(models = []) {
    const modelEnum =
        Array
            .from(new Set(['any', 'acx', 'mx', 'qfx', 'ptx', 'ex', 'srx', ...models]))
            .sort((a, b) => a.localeCompare(b));

    return {
        title: 'Junos Config Shortcuts',
        type: 'object',
        required: ['mappings'],
        additionalProperties: false,
        properties: {
            mappings: {
                type: 'array',
                minItems: 1,
                title: 'Shortcuts',
                items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['name', 'config', 'model'],

                    // 👇 This drives what gets inserted when you choose the array item completion
                    defaultSnippets: [
                        {
                            label: 'New shortcut',
                            description: 'Prefill with model: any and empty config block',
                            bodyText:
                                '- name: ${1:Shortcut name...}\n' +
                                '  model:\n' +
                                '    - any\n' +
                                '  config: |\n' +
                                '    set ...'
                        }
                    ],

                    properties: {
                        name: {
                            type: 'string',
                            title: 'Name',
                            description: 'Display name of this shortcut.',
                            $comment: 'markdownDescription: "Display name of this shortcut."',
                            minLength: 1,
                        },
                        model: {
                            type: 'array',
                            title: 'Model',
                            description: 'Applicable device model(s).',
                            $comment: 'markdownDescription: "Applicable device model(s). Supports Markdown in Monaco tooltips."',
                            uniqueItems: true,
                            minItems: 1,
                            items: {
                                anyOf: [
                                    {
                                        enum: modelEnum,
                                    },
                                    { type: 'string', minLength: 1 }
                                ]
                            }
                        },
                        config: {
                            type: 'string',
                            title: 'Config',
                            description: 'Multiline Junos configuration (set/delete lines). Use YAML block scalar (|).',
                            $comment: 'markdownDescription: "Multiline Junos configuration (set/delete lines). Use YAML block scalar (`|`)."',
                        }
                    },
                }
            }
        }
    };
}

export const defaultConfigShortcutData = `#
# Junos Configuration Mapping
#
# This YAML defines named shortcuts for Junos configuration snippets.
# Each shortcut maps a display 'name' to a block of configuration commands.
#
# Notes:
#   • Use 'any' in 'model' if the shortcut applies to all platforms.
#   • The 'config' field must use a YAML block scalar (|) containing
#     Junos "set" or "delete" style configuration lines.
#
# Example Format:
#   mappings:
#     - name: <shortcut name>
#       model:
#         - ex
#         - qfx
#         - srx
#       config: |
#         set ...
#         delete ...
#
mappings:
  - name: Add Filter Example
    model:
      - any
    config: |
      set groups jccm-example firewall family inet filter filter1 term any then accept

  - name: Delete Filter Example
    model:
      - any
    config: |
      delete groups jccm-example
`;