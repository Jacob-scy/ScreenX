const { app, desktopCapturer } = require('electron');

app.whenReady().then(async () => {
    console.log('Testing desktopCapturer...');
    try {
        const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: { width: 2560, height: 1440 }
        });
        console.log('desktopCapturer sources:', sources.length);
        if (sources.length > 0) {
            const thumb = sources[0].thumbnail;
            const size = thumb.getSize();
            console.log('Successfully captured screen via desktopCapturer! Size:', size.width, 'x', size.height);
            console.log('IsEmpty:', thumb.isEmpty());
        }
    } catch (e) {
        console.error('desktopCapturer failed:', e);
    }
    app.quit();
});
