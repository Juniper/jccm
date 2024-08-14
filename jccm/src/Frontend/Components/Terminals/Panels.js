import * as React from 'react';
import {
    tokens,
    Label,
    Button,
    Tooltip,
} from '@fluentui/react-components';
import {
    bundleIcon,
    DismissCircle16Filled,
    DismissCircle16Regular,
    ClipboardTextEditFilled,
} from '@fluentui/react-icons';

import { Breadcrumb, BreadcrumbItem, BreadcrumbDivider } from '@fluentui/react-components';

import useStore from '../../Common/StateStore';
import XTermTerminal from './XTermTerminal';

const DismissCircle = bundleIcon(DismissCircle16Filled, DismissCircle16Regular);

const BreadcrumbComponent = ({ path }) => {
    // Split the path into segments based on '/'
    const pathSegments = path.split('/');

    return (
        <Breadcrumb
            size='small'
            style={{ color: 'white' }}
        >
            {pathSegments.map((segment, index) => (
                <React.Fragment key={`${segment}-${index}`}>
                    <BreadcrumbItem>
                        <Label
                            size='small'
                            style={{ color: 'white' }}
                        >
                            {segment}
                        </Label>
                    </BreadcrumbItem>
                    {index < pathSegments.length - 1 && <BreadcrumbDivider />}
                </React.Fragment>
            ))}
        </Breadcrumb>
    );
};

const Panels = () => {
    const { tabs, selectedTabValue, removeTab } = useStore();
    const isJunos = useStore((state) => state.getIsJunos(selectedTabValue));
    const isJunosConfigMode = useStore((state) => state.getIsJunosConfigMode(selectedTabValue));

    if (tabs.length == 0) return null;

    const handleCloseButton = () => {
        removeTab(selectedTabValue);
    };

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                width: '100%',
                height: '100%',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    width: '100%',
                    height: '100%',
                    resize: 'none',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        height: '30px',
                        width: '100%',
                        backgroundColor: tokens.colorBrandBackgroundHover,
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                        }}
                    >
                        <Tooltip
                            content='Close the terminal'
                            relationship='label'
                        >
                            <Button
                                shape='circular'
                                appearance='primary'
                                size='small'
                                icon={<DismissCircle />}
                                onMouseDown={handleCloseButton}
                            />
                        </Tooltip>

                        <div style={{ marginLeft: '5px' }}>
                            <BreadcrumbComponent path={selectedTabValue} />
                        </div>
                    </div>
                    {isJunos & isJunosConfigMode ? (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'flex-start',
                                margineRight: '100px',
                            }}
                        >
                            <ClipboardTextEditFilled style={{ color: 'white' }} />
                            <Label
                                size='small'
                                style={{ color: 'white', marginLeft: '5px', marginRight: '20px' }}
                            >
                                Junos Configuration Mode
                            </Label>
                        </div>
                    ) : null}
                </div>

                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'nowrap',
                        width: 'calc(100% - 8px)',
                        height: 'calc(100% - 8px)',
                        border: `4px solid ${tokens.colorBrandBackground}`,
                        resize: 'none',
                        overflow: 'hidden',
                    }}
                >
                    {tabs.map((item) => (
                        <div
                            key={item.path}
                            style={{
                                display: selectedTabValue === item.path ? 'flex' : 'none',
                                flexWrap: 'nowrap',
                                width: '100%',
                                height: '100%',
                                resize: 'none',
                                overflow: 'hidden',
                            }}
                        >
                            <XTermTerminal
                                key={item.path}
                                device={item}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Panels;
