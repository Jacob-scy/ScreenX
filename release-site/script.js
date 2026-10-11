// release-site/script.js
document.addEventListener('DOMContentLoaded', () => {
    // 尝试拉取最新的 release metadata
    const metaUrls = [
        'https://download.jacobscy.xyz/latest.json',
        'https://download.jacobscy.xyz/screenx/latest.json'
    ];

    const fetchMeta = async () => {
        for (const u of metaUrls) {
            try {
                const res = await fetch(u, { cache: 'no-cache' });
                if (res.ok) return await res.json();
            } catch (e) {}
        }
        return null;
    };

    fetchMeta().then(data => {
            if (data && data.version) {
                console.log('Loaded latest release metadata:', data);
                
                // 更新版本标签
                const navBadge = document.getElementById('nav-version-badge');
                if (navBadge) navBadge.textContent = 'v' + data.version;

                const specVersion = document.getElementById('spec-version');
                if (specVersion) specVersion.textContent = data.version + ' (最新正式版)';

                // 更新主下载按钮
                const mainBtn = document.getElementById('main-download-btn');
                if (mainBtn && data.installer) {
                    mainBtn.href = data.installer;
                }

                // 更新便携版链接
                const portableLink = document.getElementById('portable-download-link');
                if (portableLink && data.portable) {
                    portableLink.href = data.portable;
                }

                // 更新源码链接
                const sourceLink = document.getElementById('source-download-link');
                if (sourceLink && data.source) {
                    sourceLink.href = data.source;
                }
            }
        })
        .catch(err => {
            console.log('Using default static release links:', err.message);
        });

    // 锚点平滑滚动
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});
