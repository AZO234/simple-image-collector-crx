interface sicOptions {
  imgExtPattern: RegExp;
  getAToImg: boolean;
  thumbnailWidth: number;
  defSearchWord: string;
  swHistory: string[];
  dlFilenameType: number;
  rememberSort: boolean;
  sortColmun: string;
  sortOrder: string;
  oosDisplay: boolean;
  rememberBg: boolean;
  bgChecker: boolean;
  bgColor: string;
  useDownloadDir: boolean;
  remove1x1: boolean;
  rTimeout: number;
}

const sicDefOptions: sicOptions = {
  imgExtPattern: new RegExp(/\.(jpg|jpeg|png|svg|gif|webp|heic|heif|avif|tif|tiff|bmp|ico|psd|raw)(\?.*)*$/i),
  getAToImg: false,
  thumbnailWidth: 128,
  defSearchWord: '',
  swHistory: [],
  dlFilenameType: 0,
  rememberSort: false,
  sortColmun: '',
  sortOrder: '',
  oosDisplay: false,
  rememberBg: true,
  bgChecker: true,
  bgColor: '#FFFFFF',
  useDownloadDir: false,
  remove1x1: true,
  rTimeout: 10000
};
const sicOptions: sicOptions = Object.assign(sicDefOptions);

interface sicStorageOptions {
  rxImgExtPattern: string;
  bGetAToImg: string;
  nmbThumbWidth: string;
  txtDefSearchWord: string,
  arySwHistory: string,
  numDlFilenameType: string,
  bRememberSort: string;
  txtSortColumn: string;
  txtSortOrder: string;
  bOosDisplay: string;
  bRememberBg: string;
  bBgChecker: string;
  clrBgColor: string;
  bUseDownloadDir: string;
  bRemove1x1: string;
  nmbRTimeout: string;
}

function convertOptionsToStorage(options: sicOptions): sicStorageOptions {
  return {
    rxImgExtPattern: options.imgExtPattern.source,
    bGetAToImg: options.getAToImg.toString(),
    nmbThumbWidth: options.thumbnailWidth.toString(),
    txtDefSearchWord: options.defSearchWord,
    arySwHistory: options.swHistory.map(element => element.replace(/,/g, ',,')).join(','),
    numDlFilenameType: options.dlFilenameType.toString(),
    bRememberSort: options.rememberSort.toString(),
    txtSortColumn: options.sortColmun,
    txtSortOrder: options.sortOrder,
    bOosDisplay: options.rememberSort.toString(),
    bRememberBg: options.rememberBg.toString(),
    bBgChecker: options.bgChecker.toString(),
    clrBgColor: options.bgColor,
    bUseDownloadDir: options.useDownloadDir.toString(),
    bRemove1x1: options.remove1x1.toString(),
    nmbRTimeout: options.rTimeout.toString()
  };
}

function saveOptions(options: sicOptions) {
  saveOptionsFromStorage(convertOptionsToStorage(options));
}

function saveOptionsFromStorage(storageoptions: sicStorageOptions) {
  chrome.storage.sync.set(storageoptions);
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
  if(tab.id) {
    chrome.tabs.sendMessage(tab.id, { action: 'azo_sic_collectitems' });
  }
});

// on click contextmenu
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if(tab && tab.id) {
    switch(info.menuItemId) {
      case 'azo_sic_ci': 
        if(tab.id) {
          chrome.tabs.sendMessage(tab.id, { action: 'azo_sic_collectitems' });
        }
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
        chrome.tabs.create({ url: chrome.runtime.getURL('imglist.html') }, (newTab) => {
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
