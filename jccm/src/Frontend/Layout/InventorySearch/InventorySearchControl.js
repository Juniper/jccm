import React, { useState, useRef, useEffect } from 'react';
import {
    Tooltip,
    Label,
    SpinButton,
    Button,
    Text,
    Divider,
    Field,
    ProgressBar,
    Toast,
    ToastTitle,
    Accordion,
    AccordionHeader,
    AccordionItem,
    AccordionPanel,
    Popover,
    PopoverSurface,
    PopoverTrigger,
    tokens,
} from '@fluentui/react-components';

import {
    SearchRegular,
    PlayRegular,
    PlayCircleRegular,
    RecordStopRegular,
    ArrowSyncFilled,
    TriangleLeftRegular,
    bundleIcon,
} from '@fluentui/react-icons';

import useStore from '../../Common/StateStore';
import { RotatingIcon } from '../ChangeIcon';
import { CustomProgressBar } from './CustomProgressBar';
import { getHostListMultiple, getHostCountMultiple } from './InventorySearchUtils';
import { useNotify } from '../../Common/NotificationContext';

const SearchPlayIcon = bundleIcon(PlayCircleRegular, SearchRegular);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

import { getDeviceFacts } from '../Devices';

export const InventorySearchControl = ({ subnets, startCallback, endCallback, onAddFact }) => {
    const { notify } = useNotify(); // Correctly use the hook here
    const { settings } = useStore();

    const [isStart, setIsStart] = useState(false);
    const [searchRate, setSearchRate] = useState(10);
    const [hostSeq, setHostSeq] = useState(0);
    const [hostStatusCount, setHostStatusCount] = useState({});
    const [sshClientErrorCount, setSshClientErrorCount] = useState({});
    const isStartRef = useRef(null);
    const hostSeqRef = useRef(null);
    const hostStatusCountRef = useRef(null);

    const minRate = 3;
    const maxRate = 30;

    const totalHostCount = getHostCountMultiple(subnets);

    useEffect(() => {
        isStartRef.current = isStart;
        hostSeqRef.current = hostSeq;
        hostStatusCountRef.current = hostStatusCount;
    }, [isStart, hostSeq, hostStatusCount]);

    const updateHostStatusCount2 = (status) => {
        setHostStatusCount((prevStatus) => {
            const updatedStatus = { ...prevStatus };
            if (updatedStatus[status]) {
                updatedStatus[status] += 1;
            } else {
                updatedStatus[status] = 1;
            }
            return updatedStatus;
        });
    };

    const updateCount = (result) => {
        const { status, message } = result;

        setHostStatusCount((prevStatus) => {
            const updatedStatus = { ...prevStatus };
            if (updatedStatus[status]) {
                updatedStatus[status] += 1;
            } else {
                updatedStatus[status] = 1;
            }
            return updatedStatus;
        });

        if (status === 'SSH Client Error') {
            setSshClientErrorCount((prevMessage) => {
                const updatedMessage = { ...prevMessage };
                if (updatedMessage[message]) {
                    updatedMessage[message] += 1;
                } else {
                    updatedMessage[message] = 1;
                }
                return updatedMessage;
            });
        }
    };

    const fetchDeviceFacts = async (device) => {
        const maxRetries = 2;
        const retryInterval = 1000; // 1 seconds in milliseconds
        let response;

        const bastionHost = settings?.bastionHost || {};

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            response = await getDeviceFacts({ ...device, timeout: 5000 }, false, bastionHost);

            // console.log(`${device.address}: response: `, response);

            if (response.status) {
                // updateHostStatusCount(response.result.status);
                updateCount(response.result);
                
                const { address, port, username, password } = device;

                if (!!response.result.vc) {
                    const { osName, osVersion, hostName } = response.result.systemInformation;

                    const memberHardwareModel = [];
                    const memberSerialNumber = [];

                    response.result.vc.forEach((member, index) => {
                        memberHardwareModel.push(member.model);
                        memberSerialNumber.push(member.serial);
                    });

                    await onAddFact({
                        address,
                        port,
                        username,
                        password,
                        hardwareModel: { label: 'Virtual Chassis', values: memberHardwareModel },
                        serialNumber: {
                            label: `${memberSerialNumber.length} item${memberSerialNumber.length > 1 ? 's' : ''}`,
                            values: memberSerialNumber,
                        },
                        osName,
                        osVersion,
                        hostName,
                    });
                } else {
                    const { hardwareModel, osName, osVersion, serialNumber, hostName } =
                        response.result.systemInformation;

                    await onAddFact({
                        address,
                        port,
                        username,
                        password,
                        hardwareModel,
                        osName,
                        osVersion,
                        serialNumber,
                        hostName,
                    });
                }

                return response;
            } else {
                await delay(retryInterval);
            }
        }

        // updateHostStatusCount(response.result.status);
        updateCount(response.result);

        return response;
    };

    const processSubnets = async (subnets) => {
        console.log('processSubnets....');
        setHostStatusCount({});
        await delay(300);

        let n = 1;
        const promises = []; // Array to hold all the promises
        const startTime = Date.now();
        const interval = 1000 / searchRate; // Desired interval between each command

        setHostStatusCount({});
        setSshClientErrorCount({});

        for (const device of getHostListMultiple(subnets)) {
            promises.push(fetchDeviceFacts(device)); // Add the promise to the array
            setHostSeq(n++);

            const expectedNextStart = startTime + n * interval;
            const currentTime = Date.now();
            const dynamicDelay = expectedNextStart - currentTime;

            if (dynamicDelay > 0) {
                await delay(dynamicDelay); // Adjust delay dynamically
            }

            if (isStartRef.current === false) return;
        }

        await Promise.all(promises); // Wait for all promises to resolve

        await delay(1000);
        setIsStart(false);
        endCallback(false);

        await delay(1000);
        notify(
            <Toast>
                <ToastTitle>
                    The local subnets processing has been successfully.
                    <br />
                    {hostSeqRef.current} hosts were processed.
                </ToastTitle>
            </Toast>,
            { intent: 'success' }
        );
    };

    const onClickSearchStart = async () => {
        setIsStart(true);
        startCallback(true);

        setHostSeq(0);
        await processSubnets(subnets);
    };

    const onClickSearchStop = async () => {
        setIsStart(false);
        endCallback(false);
    };

    const handleSpinButtonChange = (event, { value, displayValue }) => {
        if (value !== undefined) {
            setSearchRate(value);
            console.log('search rate: ' + value);
        } else if (displayValue !== undefined) {
            const newValue = parseInt(displayValue);
            if (!Number.isNaN(newValue)) {
                setSearchRate(newValue);
                console.log('search rate: ' + newValue);
            } else {
                console.error(`Cannot parse "${displayValue}" as a number.`);
            }
        }
    };

    const rotateSpeed = (minRate * 1000) / Math.min(1 + searchRate / 2, 10);
    const rotateColors = [
        tokens.colorPaletteGreenBorderActive,
        tokens.colorPaletteBlueBorderActive,
        tokens.colorPalettePinkBorderActive,
        tokens.colorPaletteMagentaBorderActive,
        tokens.colorPalettePlumBorderActive,
        tokens.colorStatusDangerBorderActive,
        tokens.colorStatusDangerBorder2,
        tokens.colorPaletteGrapeBorderActive,
        tokens.colorPalettePurpleBorderActive,
    ];
    const rotateColorIndex = Math.floor(((searchRate - minRate) / (maxRate - minRate)) * (rotateColors.length - 1));
    const rotateColor = rotateColors[rotateColorIndex];

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                gap: '10px',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    // height: '24px',
                    overflow: 'visible',
                    gap: '10px',
                }}
            >
                {!isStart ? (
                    <Button
                        disabled={subnets?.length === 0}
                        icon={<SearchPlayIcon />}
                        shape='circular'
                        appearance='subtle'
                        size='small'
                        onClick={onClickSearchStart}
                    >
                        Search
                    </Button>
                ) : (
                    <Button
                        disabled={subnets?.length === 0}
                        icon={
                            <RotatingIcon
                                Icon={TriangleLeftRegular}
                                rotationDuration={`${rotateSpeed}ms`}
                                color={rotateColor}
                            />
                        }
                        shape='circular'
                        appearance='subtle'
                        size='small'
                        onClick={onClickSearchStop}
                    >
                        Stop
                    </Button>
                )}

                {isStart || (totalHostCount > 0 && hostSeq === totalHostCount) ? (
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            width: '75%',
                        }}
                    >
                        <CustomProgressBar
                            message={{ hostSeq, totalHostCount, hostStatusCount, sshClientErrorCount }}
                            size={100}
                            max={totalHostCount}
                            value={hostSeq}
                            isStart={isStart}
                        />
                    </div>
                ) : null}

                <Tooltip
                    content={
                        <Text
                            align='start'
                            wrap
                            size={100}
                        >
                            Select search rate ({minRate}-{maxRate} per second). Please ensure there are no security
                            issues when searching at a high rate.
                        </Text>
                    }
                    positioning='below'
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            gap: '5px',
                            width: '200px',
                        }}
                    >
                        <Label size='small'>Search Rate</Label>
                        <SpinButton
                            defaultValue={searchRate}
                            appearance='filled-darker'
                            min={minRate}
                            max={maxRate}
                            size='small'
                            style={{ width: '70px' }}
                            onChange={handleSpinButtonChange}
                        />
                    </div>
                </Tooltip>
            </div>
        </div>
    );
};
