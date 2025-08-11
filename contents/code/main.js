const Ignorelist = readConfig("Ignorelist", "an.app.placeholder.name").toString().toLowerCase().split(",");
var lastToggleTime = 0;

function toggleNight() {
    callDBus(
        "org.kde.kglobalaccel",           // 服务名
        "/component/kwin",          // 对象路径
        "org.kde.kglobalaccel.Component",           // 接口名
        "invokeShortcut",                 // 方法名
        "Toggle Night Color"           // 参数
    );
}

function onNightRunning(callback) {
    return callDBus(
        "org.kde.KWin",                      // 服务名
        "/org/kde/KWin/NightLight",          // 对象路径
        "org.freedesktop.DBus.Properties",   // 接口名
        "Get",                               // 方法名
        "org.kde.KWin.NightLight",           // 接口参数
        "running",                            // 属性名
        callback = callback
    );
}

function needNight() {
    for (let w of workspace.windowList()) {
        const resourceClass = w.desktopFileName || w.resourceClass || "";
        if (resourceClass && Ignorelist.includes(resourceClass.toString().toLowerCase())) {
            continue;
        }
        if (w.normalWindow && w.fullScreen && w.layer > 2 && w.active) {
            print(`fullScreen app caption: ${w.caption}, layer: ${w.layer},` +
                ` desktopFileName: ${w.desktopFileName}, resourceClass: ${w.resourceClass}`);
            return false;
        }
    }
    return true;
}

function nightCallback(isNight) {
    const need = needNight();
    const now = Date.now();
    if (now - lastToggleTime < 2000) {
        print(`Toggle too frequent, isNight: ${isNight}, need: ${need}`);
        return;
    }
    if (isNight !== need) {
        toggleNight();
        lastToggleTime = now;
        print(`Toggle Night Light, isNight: ${isNight}, need: ${need}`);
    }
}

// 检查并调整Night Light状态
function checkAndAdjustNightLight(signal, window) {
    if (window && (!window.normalWindow)) {
        return;
    }
    // if (window) {
    //     print(`Window ${signal}: ${window.caption} (${window.desktopFileName})`);
    // }
    onNightRunning(nightCallback);
}

function addWindowCallback(window) {
    if (!window.normalWindow || !window.caption) {
        return;
    }
    print(`Add callback for: ${window.caption} (${window.desktopFileName} | ${window.resourceClass})`);
    window.fullScreenChanged.connect(function() {
        checkAndAdjustNightLight('fullscreen_changed', window);
    });
}

// 监听窗口激活事件（窗口切换）
workspace.windowActivated.connect(function (window) {
    checkAndAdjustNightLight('activated', window);
});

// 监听窗口添加事件
workspace.windowAdded.connect(addWindowCallback);

// 监听窗口移除事件
workspace.windowRemoved.connect(function (window) {
    checkAndAdjustNightLight('removed', window);
});

// 初始化时检查一次
print(`auto night running, Ignorelist: ${Ignorelist}`);
onNightRunning(nightCallback);
for (let w of workspace.windowList()) {
    addWindowCallback(w);
}
