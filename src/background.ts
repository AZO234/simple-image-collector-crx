interface sicOptions {
  imgExtPattern: RegExp;
  getAToImg: boolean;
  thumbnailWidth: number;
  rememberSort: boolean;
  sortColmun: string;
  sortOrder: string;
  bgChecker: boolean;
  bgColor: string;
  remove1x1: boolean;
  irTimeout: number;
}

const sicDefOptions: sicOptions = {
  imgExtPattern: new RegExp(/\.(jpg|jpeg|png|svg|gif|webp|tif|tiff|bmp|ico|psd|raw)(\?.*)*$/i),
  getAToImg: false,
  thumbnailWidth: 128,
  rememberSort: false,
  sortColmun: '',
  sortOrder: '',
  bgChecker: true,
  bgColor: '#FFFFFF',
  remove1x1: true,
  irTimeout: 10000
};
const sicOptions = Object.assign(sicDefOptions);

interface sicStorageOptions {
  rxImgExtPattern: string;
  bGetAToImg: string;
  nmbThumbWidth: string;
  bRememberSort: string;
  txtSortColumn: string;
  txtSortOrder: string;
  bBgChecker: string;
  clrBgColor: string;
  bRemove1x1: string;
  nmbIRTimeout: string;
}

function convertOptionsToStorage(options: sicOptions): sicStorageOptions {
  return {
    rxImgExtPattern: options.imgExtPattern.toString(),
    bGetAToImg: options.getAToImg.toString(),
    nmbThumbWidth: options.thumbnailWidth.toString(),
    bRememberSort: options.rememberSort.toString(),
    txtSortColumn: options.sortColmun,
    txtSortOrder: options.sortOrder,
    bBgChecker: options.bgChecker.toString(),
    clrBgColor: options.bgColor,
    bRemove1x1: options.remove1x1.toString(),
    nmbIRTimeout: options.irTimeout.toString()
  };
}

function saveOptions(options: sicOptions) {
  saveOptionsFromStorage(convertOptionsToStorage(options));
}

function saveOptionsFromStorage(storageoptions: sicStorageOptions) {
  chrome.storage.sync.set(storageoptions);
}

function loadOptions() {
  const storageOptions: sicStorageOptions = convertOptionsToStorage(sicOptions);
  chrome.storage.sync.get(Object.keys(storageOptions), (result) => {
    sicOptions.imgExtPattern = new RegExp(result['rxImgExtPattern']);
    sicOptions.getAToImg = result['bGetAToImg'] === 'true';
    sicOptions.thumbnailWidth = Number(result['nmbThumbWidth']);
    sicOptions.rememberSort = result['bRememberSort'] === 'true';
    sicOptions.sortColmun = result['txtSortColumn'];
    sicOptions.sortOrder = result['txtSortOrder'];
    sicOptions.bgChecker = result['bBgChecker'] === 'true';
    sicOptions.bgColor = result['clrBgColor'];
    sicOptions.remove1x1 = result['bRemove1x1'] === 'true';
    sicOptions.irTimeout = Number(result['nmbIRTimeout']);
  });
}

// on extension installed
chrome.runtime.onInstalled.addListener(() => {
  // contextmenu
  chrome.contextMenus.create({
    id: 'azo_sic_ci',
    title: 'Collect images'
  });

  // save default options
  saveOptions(sicDefOptions);
});

// on click extentions icon
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    if(tabs[0].id) {
      await chrome.tabs.sendMessage(tabs[0].id, { action: 'azo_sic_collectitems' });
    }
  });
});

// on click contextmenu
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if(tab && tab.id) {
    switch(info.menuItemId) {
      case 'azo_sic_ci': 
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
          if(tabs[0].id) {
            await chrome.tabs.sendMessage(tabs[0].id, { action: 'azo_sic_collectitems' });
          }
        });
        break;
    }
  }
});

// on message
chrome.runtime.onMessage.addListener((message) => {
  let newTabId = 0;
  switch(message.action) {
    case 'azo_sic_itemscollected':
      chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
        const activeTab = activeTabs[0];
        chrome.tabs.create({ url: 'imglist.html' }, (newTab) => {
          if(newTab.id) {
            newTabId = newTab.id;
            chrome.tabs.move(newTabId, { index: activeTab.index + 1 });
            chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
              if (tabId === newTabId && changeInfo.status === 'complete') {
                await chrome.tabs.sendMessage(newTabId, {
                  action: 'azo_sic_sendlist',
                  title: message.title,
                  url: message.url,
                  sicitems: message.sicitems
                });
              }
            });
          }
        });
      });
      break;

    case 'azo_sic_savedefoptions':
      saveOptions(sicDefOptions);
      break;

    case 'azo_sic_saveoptions':
      saveOptionsFromStorage(message.storageoptions);
      break;
  }
});
