import React, { useState, useRef } from 'react';

import {
    Button,
    Link,
    Text,
    Tooltip,
    Popover,
    PopoverSurface,
    PopoverTrigger,
    makeStyles,
    tokens,
} from '@fluentui/react-components';
const { electronAPI } = window;

import {
    ShieldFilled,
    ShieldQuestionFilled,
    LightbulbCircleRegular,
    LightbulbCircleFilled,
    bundleIcon,
} from '@fluentui/react-icons';

import useStore from '../Common/StateStore';

const ProductModelInfoIcon = bundleIcon(ShieldQuestionFilled, ShieldFilled);

const ValidationIcon = bundleIcon(
    LightbulbCircleFilled,
    LightbulbCircleRegular
);

const tooltipStyles = makeStyles({
    tooltipMaxWidthClass: {
        maxWidth: '800px',
    },
});

export default () => {
    const { settings, exportSettings, setSettings } = useStore();
    const { user, isUserLoggedIn, supportedDeviceModels } = useStore();

    const cloudDescription = user?.cloudDescription || 'Unknown';
    const deviceModelsValidation = settings?.deviceModelsValidation || false;
    const deviceModelsInType = Object.entries(supportedDeviceModels).reduce(
        (acc, [model, value]) => {
            const { type } = value;

            if (!acc[type]) {
                acc[type] = [];
            }

            acc[type].push({ model, ...value });

            return acc;
        },
        {}
    );

    // Sort the devices by model within each type
    Object.keys(deviceModelsInType).forEach((type) => {
        deviceModelsInType[type].sort((a, b) => a.model.localeCompare(b.model));
    });

    const handleOnClickOfProductModelInfo = () => {
        const saveFunction = async () => {
            const newSettings = {
                ...settings,
                deviceModelsValidation: !deviceModelsValidation,
            };
            setSettings(newSettings);
            exportSettings(newSettings);
        };
        saveFunction();
    };

    const styles = tooltipStyles();

    return (
        isUserLoggedIn && (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                }}
            >
                <Tooltip
                    content={{
                        className: styles.tooltipMaxWidthClass,
                        children: (
                            <Text style={{ fontSize: '10px' }}>
                                Product model validation before adoption is{' '}
                                <span
                                    style={{
                                        fontWeight: 'bold',
                                        color: deviceModelsValidation
                                            ? tokens.colorNeutralForeground3BrandHover
                                            : tokens.colorNeutralForeground4,
                                    }}
                                >
                                    {deviceModelsValidation
                                        ? 'enabled'
                                        : 'disabled'}
                                </span>
                                .
                            </Text>
                        ),
                    }}
                    relationship='description'
                    withArrow
                    positioning='above'
                >
                    <Button
                        icon={
                            <ProductModelInfoIcon
                                style={{
                                    transform: 'scale(0.8)',
                                    transformOrigin: 'center',
                                    color: deviceModelsValidation
                                        ? tokens.colorNeutralForeground2BrandHover
                                        : tokens.colorNeutralForeground4,
                                }}
                            />
                        }
                        shape='circular'
                        appearance='transparent'
                        size='small'
                        onClick={handleOnClickOfProductModelInfo}
                    />
                </Tooltip>
                <Popover withArrow>
                    <PopoverTrigger>
                        <Link style={{ fontSize: '10px' }} appearance='subtle'>
                            Product Models for {cloudDescription} Service
                        </Link>
                    </PopoverTrigger>
                    <PopoverSurface
                        tabIndex={-1}
                        style={{
                            padding: 0,
                            margin: 0,
                            overflow: 'hidden',
                            border: 0,
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px',
                                    paddingTop: '10px',
                                    paddingLeft: '10px',
                                    paddingRight: 0,
                                    paddingBottom: '10px',
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: '14px',
                                    }}
                                >
                                    Supported Product Model Information
                                </Text>

                                <div
                                    style={{
                                        width: 'calc(100% - 10px)', // Make the width 10px shorter than the full width
                                        height: 0,
                                        overflow: 'hidden',
                                        borderBottom: `1px solid ${tokens.colorBrandBackground2Hover}`,
                                        marginBottom: '5px',
                                    }}
                                />

                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        gap: '50px',
                                        paddingLeft: '10px',
                                    }}
                                >
                                    {Object.entries(deviceModelsInType).map(
                                        ([type, devices]) => (
                                            <div key={type} style={{ flex: 1 }}>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent:
                                                            'center',
                                                        alignItems: 'center',
                                                        width: '100px',
                                                        height: '18px',
                                                        border: `0.5px solid ${tokens.colorNeutralStroke1}`,
                                                        borderRadius: '50px',
                                                        textAlign: 'center',
                                                        marginBottom: '5px',
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            fontSize: '10px',
                                                        }}
                                                    >
                                                        {type.toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        gap: '80px', // Set an 80px gap between each type column group
                                        height: '75vh', // Set the total height to 80% of the viewport
                                        overflowY: 'auto', // Enable vertical scrolling for the entire container
                                        paddingLeft: '10px',
                                        paddingRight: '10px',
                                    }}
                                >
                                    {Object.entries(deviceModelsInType).map(
                                        ([type, devices]) => (
                                            <div key={type} style={{ flex: 1 }}>
                                                <div
                                                    key={type}
                                                    style={{
                                                        display: 'grid',
                                                        gridTemplateColumns:
                                                            'repeat(3, minmax(0, 1fr))',
                                                        columnGap: '20px',
                                                        rowGap: '2px',
                                                        padding: '3px',
                                                        gridAutoFlow: 'row',
                                                    }}
                                                >
                                                    {devices.map(
                                                        (device, index) => (
                                                            <div
                                                                key={`${type}-${device.model}-${index}`}
                                                            >
                                                                <Text
                                                                    key={
                                                                        device.model
                                                                    }
                                                                    style={{
                                                                        fontSize:
                                                                            '9px',
                                                                        margin: '0',
                                                                        whiteSpace:
                                                                            'nowrap', // Prevent text wrapping
                                                                        overflow:
                                                                            'hidden', // Hide overflowed text
                                                                        textOverflow:
                                                                            'ellipsis', // Optionally add ellipsis for long text
                                                                    }}
                                                                >
                                                                    {
                                                                        device.model
                                                                    }
                                                                </Text>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    height: '30px',
                                    width: '100%',
                                    alignItems: 'center',
                                    justifyContent: 'flex-start',
                                    paddingLeft: '10px',
                                    gap: '5px',
                                    position: 'relative',
                                    bottom: 0,
                                    left: 0,
                                    backgroundColor:
                                        tokens.colorNeutralBackground2,
                                }}
                            >
                                <ValidationIcon />
                                <Text style={{ fontSize: '11px' }}>
                                    Product model validation before adoption is{' '}
                                    <span
                                        style={{
                                            fontWeight: 'bold',
                                            color: deviceModelsValidation
                                                ? tokens.colorNeutralForeground3BrandHover
                                                : tokens.colorPaletteDarkOrangeForeground1,
                                        }}
                                    >
                                        {deviceModelsValidation
                                            ? 'enabled'
                                            : 'disabled'}
                                    </span>
                                    .
                                </Text>
                            </div>
                        </div>
                    </PopoverSurface>
                </Popover>
            </div>
        )
    );
};
