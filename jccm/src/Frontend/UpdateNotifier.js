import React, { useEffect, useState } from 'react';

const UpdateNotifier = () => {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [updateDownloaded, setUpdateDownloaded] = useState(false);

    useEffect(() => {
        // Listen for update available event
        window.electronAPI.onUpdateAvailable(() => {
            setUpdateAvailable(true);
            alert('A new update is available. Downloading now...');
        });

        // Listen for update downloaded event
        window.electronAPI.onUpdateDownloaded(() => {
            setUpdateDownloaded(true);
        });
    }, []);

    const installUpdate = () => {
        window.electronAPI.installUpdate(); // Trigger the update installation
    };

    return (
        <div>
            {updateAvailable && <p>Update is being downloaded...</p>}
            {updateDownloaded && (
                <div>
                    <p>Update downloaded. Ready to install.</p>
                    <button onClick={installUpdate}>Install Update</button>
                </div>
            )}
        </div>
    );
};

export default UpdateNotifier;
