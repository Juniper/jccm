import React, { useState, useRef, useEffect } from 'react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import 'ag-grid-community/styles/ag-theme-balham.css';
import _, { method, set } from 'lodash';

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
    ToolbarDivider,
    makeStyles,
    tokens,
} from '@fluentui/react-components';
import {
    DismissFilled,
    DismissRegular,
    ArrowResetFilled,
    ArrowResetRegular,
    SaveRegular,
    SaveFilled,
    FolderOpenRegular,
    FolderOpenFilled,
    ArrowExportRegular,
    ArrowExportFilled,
    EqualCircleFilled,
    EqualCircleRegular,
    CircleShadowRegular,
    CircleRegular,
    bundleIcon,
} from '@fluentui/react-icons';

const { electronAPI } = window;

import { useNotify } from '../Common/NotificationContext';
import useStore from '../Common/StateStore';
import { cliShortcutDataSchema, defaultCliShortcutData } from '../Common/CommonVariables';
import { MonacoEditor } from '../Components/Editor/MonacoEditor';

import yaml from 'js-yaml';
import Ajv from 'ajv';

const DismissIcon = bundleIcon(DismissFilled, DismissRegular);
const ResetIcon = bundleIcon(ArrowResetFilled, ArrowResetRegular);
const SaveIcon = bundleIcon(SaveFilled, SaveRegular);
const LoadIcon = bundleIcon(FolderOpenFilled, FolderOpenRegular);
const ExportIcon = bundleIcon(ArrowExportFilled, ArrowExportRegular);
const BackToDefaultIcon = bundleIcon(CircleShadowRegular, CircleRegular);
const tooltipStyles = makeStyles({
    tooltipMaxWidthClass: {
        maxWidth: '400px',
    },
});

const validateYamlSchema = (yamlData, schema) => {
    const ajv = new Ajv();
    const validate = ajv.compile(schema);

    let parsedData;
    try {
        parsedData = yaml.load(yamlData);
    } catch (err) {
        throw new Error(`Invalid YAML:\n${err.message}`);
    }

    const valid = validate(parsedData);
    if (!valid) {
        console.log(validate.errors[0].message);
        throw new Error(`Schema validation error:\n${validate.errors?.[0]?.message}`);
    }

    return parsedData;
};

const EditCLIShortcutsCard = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    const { notify } = useNotify();
    const { settings, setSettings, exportSettings, setCliShortcutMapping } = useStore();

    const [line, setLine] = useState(0);
    const [column, setColumn] = useState(0);

    const editorMethodsRef = useRef(null);
    const text = settings?.cliShortcuts?.length > 0 ? settings.cliShortcuts : defaultCliShortcutData;
    const [currentText, setCurrentText] = useState(text);
    const [isChanged, setIsChanged] = useState(false);

    const [isValidSchema, setIsValidSchema] = useState(true);
    const [schemaError, setSchemaError] = useState(null);

    const fileInputRef = useRef(null);
    const tabSize = 2;

    const styles = tooltipStyles();

    const handleOnLoad = () => {
        console.log('Loading CLI Mapping');
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileImport = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const data = e.target.result;

                setCurrentText(data);

                if (editorMethodsRef.current) {
                    editorMethodsRef.current.setValue(data);
                    editorMethodsRef.current.setPosition(1, 1);
                    editorMethodsRef.current.focus();
                    setIsChanged(data !== text);
                }

                notify(
                    <Toast>
                        <ToastTitle>The CLI mapping file has been successfully imported into the editor.</ToastTitle>
                    </Toast>,
                    { intent: 'success' }
                );
            };

            // Read the file as text to directly load it into the editor
            reader.readAsText(file);
        }

        // Reset the file input so the same file can be reselected if needed
        fileInputRef.current.value = '';
    };

    const handleEditorReady = (methods) => {
        editorMethodsRef.current = methods;
        // Focus the editor after it's ready
        setTimeout(() => {
            editorMethodsRef.current.focus();
        }, 100);
    };

    const handleOnReset = () => {
        console.log('Resetting CLI Mapping');
        if (editorMethodsRef.current) {
            editorMethodsRef.current.setValue(text);
            editorMethodsRef.current.focus();
        }
    };

    const handleOnDidChangeModelContent = (newValue) => {
        setCurrentText(newValue);
        setIsChanged(newValue !== text);

        try {
            const cliShortcutMapping = validateYamlSchema(newValue, cliShortcutDataSchema);
            setIsValidSchema(true);
            setSchemaError(null);
        } catch (error) {
            setIsValidSchema(false);
            setSchemaError(error.message);
        }
    };

    const handleOnBackToDefault = () => {
        console.log('Back to Default CLI Mapping');
        if (editorMethodsRef.current) {
            editorMethodsRef.current.setValue(defaultCliShortcutData);
            editorMethodsRef.current.focus();
        }
    };

    const handleOnSave = () => {
        console.log('Saving CLI Mapping');

        if (editorMethodsRef.current) {
            const saveFunction = async (value) => {
                const newSettings = {
                    ...settings,
                    cliShortcuts: value,
                };
                setSettings(newSettings);
                exportSettings(newSettings);
            };

            const value = editorMethodsRef.current.getValue();
            saveFunction(value);
            setIsChanged(false);

            try {
                const mapping = yaml.load(value);
                setCliShortcutMapping(mapping);
                console.log('CLI Mapping saved:', mapping);
            } catch (error) {
                console.log('Error saving CLI mapping:', error);
                notify(
                    <Toast>
                        <ToastTitle>CLI Mapping Update</ToastTitle>
                        <ToastBody subtitle='Update Failed'>
                            <div>
                                <Text>The CLI shortcut mapping entries have failed to be updated.</Text>
                                <Text size={300}>{error.message}</Text>
                            </div>
                        </ToastBody>
                    </Toast>,
                    { intent: 'error' }
                );
                return;
            }

            notify(
                <Toast>
                    <ToastTitle>CLI Mapping Update</ToastTitle>
                    <ToastBody subtitle='Update Successful'>
                        <Text>The CLI shortcut mapping entries have been successfully updated.</Text>
                    </ToastBody>
                </Toast>,
                { intent: 'success' }
            );
        }
    };

    const handleOnExport = async () => {
        console.log('Exporting CLI Mapping');
        if (editorMethodsRef.current) {
            const value = editorMethodsRef.current.getValue();

            // Generate a date string (e.g., "2023-10-14")
            const dateStr = new Date().toISOString().slice(0, 10);
            const fileName = `cli-mapping-${dateStr}.yaml`;

            try {
                // Prompt the user for where to save the file
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: fileName,
                    types: [
                        {
                            description: 'YAML files',
                            accept: { 'text/yaml': ['.yaml', '.yml'] },
                        },
                    ],
                });

                // Create a writable stream and write the file
                const writable = await fileHandle.createWritable();
                await writable.write(value);
                await writable.close();

                notify(
                    <Toast>
                        <ToastTitle>Export Successful</ToastTitle>
                        <ToastBody>
                            <Text>Your CLI mapping has been successfully exported to {fileName}.</Text>
                        </ToastBody>
                    </Toast>,
                    { intent: 'success' }
                );
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Error exporting file:', error);
                    notify(
                        <Toast>
                            <ToastTitle>Export Failed</ToastTitle>
                            <ToastBody>
                                <Text>There was an error exporting the CLI mapping file.</Text>
                            </ToastBody>
                        </Toast>,
                        { intent: 'error' }
                    );
                } else {
                    // User canceled the save dialog
                    console.log('Save was canceled');
                }
            }
        }
    };

    const handlePositionUpdate = (newLine, newColumn) => {
        setLine(newLine);
        setColumn(newColumn);
    };

    return (
        <Dialog
            open={isOpen}
            onDismiss={onClose}
            modalProps={{
                isBlocking: false,
                trapFocus: false,
                focusTrapZoneProps: {
                    handleTabKey: 'none',
                    disableFirstFocus: true,
                    forceFocusInsideTrap: false,
                },
            }}
        >
            <DialogSurface
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    minWidth: '90%',
                    height: '90%',
                    overflow: 'hidden',
                    padding: 0,
                    border: 0,
                    background: tokens.colorNeutralBackground1,
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        height: '100%',
                        flex: 1,
                        padding: '15px 0px 5px 0px',
                        boxSizing: 'border-box',
                    }}
                >
                    {/* Header - Dismiss */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            marginBottom: '10px',
                            marginLeft: '15px',
                            marginRight: '15px',
                        }}
                    >
                        <Text size={400}>CLI Command Shortcuts Mapping</Text>
                        <Button
                            tabIndex={-1}
                            onClick={onClose}
                            shape='circular'
                            appearance='subtle'
                            icon={<DismissIcon />}
                            size='small'
                        />
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '10px',
                            marginLeft: '15px',
                            marginRight: '15px',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                justifyContent: 'flex-start',
                                alignItems: 'center',
                            }}
                        >
                            <Button
                                tabIndex={-1}
                                disabled={currentText === defaultCliShortcutData}
                                onClick={() => {
                                    handleOnBackToDefault();
                                }}
                                shape='circular'
                                appearance='subtle'
                                icon={<BackToDefaultIcon fontSize='16px' />}
                                size='small'
                            >
                                Back to Default Mapping
                            </Button>
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                justifyContent: 'flex-end',
                                alignItems: 'center',
                            }}
                        >
                            <Button
                                tabIndex={-1}
                                disabled={!isChanged}
                                onClick={() => {
                                    handleOnReset();
                                }}
                                shape='circular'
                                appearance='subtle'
                                icon={<ResetIcon fontSize='16px' />}
                                size='small'
                            >
                                Reset Changes
                            </Button>

                            <Button
                                tabIndex={-1}
                                disabled={!isChanged || !isValidSchema}
                                onClick={() => {
                                    handleOnSave();
                                }}
                                shape='circular'
                                appearance='subtle'
                                icon={<SaveIcon fontSize='16px' />}
                                size='small'
                            >
                                Save Changes
                            </Button>

                            <ToolbarDivider />

                            <Button
                                tabIndex={-1}
                                onClick={() => {
                                    handleOnLoad();
                                }}
                                shape='circular'
                                appearance='subtle'
                                icon={<LoadIcon fontSize='16px' />}
                                size='small'
                            >
                                Import Mappings
                            </Button>
                            <Button
                                tabIndex={-1}
                                onClick={() => {
                                    handleOnExport();
                                }}
                                shape='circular'
                                appearance='subtle'
                                icon={<ExportIcon fontSize='16px' />}
                                size='small'
                            >
                                Export Mappings
                            </Button>
                        </div>
                    </div>

                    <div style={{ width: '100%', height: '100%' }}>
                        <MonacoEditor
                            text={text}
                            onDidChangeCursorPosition={handlePositionUpdate}
                            onEditorReady={handleEditorReady}
                            onDidChangeModelContent={handleOnDidChangeModelContent}
                            tabSize={tabSize}
                        />
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '5px',
                            marginLeft: '15px',
                            marginRight: '15px',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                justifyContent: 'flex-start',
                                alignItems: 'center',
                            }}
                        >
                            {!isValidSchema && (
                                <Tooltip
                                    content={{
                                        className: styles.tooltipMaxWidthClass,
                                        children: (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                }}
                                            >
                                                {schemaError?.split('\n').map((message, index) => (
                                                    <Text key={index} size={100}>
                                                        {message}
                                                    </Text>
                                                ))}
                                            </div>
                                        ),
                                    }}
                                    relationship='description'
                                    withArrow
                                    positioning='above-end'
                                >
                                    <Text size={100}>Invalid Data (Hover for details)</Text>
                                </Tooltip>
                            )}
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                justifyContent: 'flex-end',
                                alignItems: 'center',
                                gap: '10px',
                            }}
                        >
                            <Text size={100}>
                                Ln {line}, Col {column}
                            </Text>
                            <Text size={100}>Tab Spaces: {tabSize}</Text>
                        </div>
                    </div>
                    <input
                        type='file'
                        ref={fileInputRef}
                        onChange={handleFileImport}
                        style={{ display: 'none' }}
                        accept='.yaml, .yml'
                    />
                </div>
            </DialogSurface>
        </Dialog>
    );
};

export default EditCLIShortcutsCard;
