import React, { useState, useRef, useEffect } from 'react';

import {
    Dialog,
    DialogSurface,
    Button,
    Label,
    Text,
    Field,
    SpinButton,
    Toast,
    ToastTitle,
    ToastBody,
    Tooltip,
    Divider,
    Menu,
    MenuTrigger,
    MenuList,
    MenuItem,
    MenuPopover,
    MenuItemRadio,
    MenuGroup,
    MenuGroupHeader,
    MenuDivider,
    Toolbar,
    ToolbarButton,
    ToolbarDivider,
    tokens,
} from '@fluentui/react-components';

import {
    ArrowCircleRightRegular,
    PlayCircleHintRegular,
    PlayCircleHintFilled,
    PlayCircleRegular,
    PhoneKeyRegular,
    PhoneKeyFilled,
    KeyRegular,
    bundleIcon,
} from '@fluentui/react-icons';

import { read, utils, writeFile } from 'xlsx';

import useStore from '../Common/StateStore';
import { useNotify } from '../Common/NotificationContext';
import { is } from 'immutable';
import VaultEdit from './VaultEdit';

const PasswordVaultConfigIcon = bundleIcon(PhoneKeyRegular, PhoneKeyRegular);

export const Vault = ({
    editable = false,
    onClick = null,
    help = 'Securely store and manage device access passwords in the Vault',
}) => {
    const { notify } = useNotify(); // Correctly use the hook here
    const { vault, setVault } = useStore();
    const [isEdit, setIsEdit] = useState(false);

    const onClickAction = onClick
        ? (tag) => {
              const passwordTag = '${vault:' + tag + '}';
              onClick(passwordTag);
          }
        : (tag) => {
              const clipboardText = `\${vault:${tag}}`;
              navigator.clipboard.writeText(clipboardText).then(
                  () => {
                      console.log('Copied to clipboard:', clipboardText);
                      notify(
                          <Toast>
                              <ToastTitle>
                                 <Text size={200}>Password tag "{clipboardText}" copied from the vault successfully.</Text> 
                              </ToastTitle>
                          </Toast>,
                          { intent: 'success' }
                      );
                  },
                  (err) => {
                      console.error('Failed to copy to clipboard:', err);
                  }
              );
          };

    return (
        <div>
            <Menu>
                <MenuTrigger disableButtonEnhancement>
                    <Tooltip content={help} relationship='label' withArrow positioning='above-end'>
                        <ToolbarButton
                            icon={<PasswordVaultConfigIcon style={{ fontSize: '20px' }} />}
                            appearance='subtle'
                        />
                    </Tooltip>
                </MenuTrigger>
                <MenuPopover>
                    <MenuList>
                        <MenuGroup>
                            {vault.length > 0 && (
                                <div>
                                    <MenuGroupHeader>Copy Vault Password Tag</MenuGroupHeader> <MenuDivider />
                                    {(vault || []).map(({ tag, password }) => (
                                        <MenuItem
                                            key={tag}
                                            onClick={() => {
                                                onClickAction(tag);
                                            }}
                                            icon={<KeyRegular style={{ fontSize: '12px' }} />}
                                        >
                                            <Text size={200}>{tag}</Text>
                                        </MenuItem>
                                    ))}
                                </div>
                            )}
                            {editable && (
                                <div>
                                    {vault.length > 0 && <MenuDivider />}

                                    <MenuItem
                                        key='edit-secure-password'
                                        onClick={() => {
                                            setIsEdit(true);
                                        }}
                                    >
                                        <Text size={200} weight='medium'>
                                            Edit Secure Password
                                        </Text>
                                    </MenuItem>
                                </div>
                            )}
                        </MenuGroup>
                    </MenuList>
                </MenuPopover>
            </Menu>
            {isEdit && (
                <VaultEdit
                    isOpen={isEdit}
                    onClose={() => {
                        setIsEdit(false);
                    }}
                />
            )}
        </div>
    );
};
