const sicDefOptionsOp: sicOptions = {
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
  remove1x1: true,
  rTimeout: 10000,
  a2IfUrl: 'http://localhost:6800/jsonrpc',
  a2DlDirW: '',
  a2DlDirP: ''
};
const sicOptionsOp: sicOptions = Object.assign(sicDefOptionsOp);

function convertOptionsToStorageOp(options: sicOptions): sicStorageOptions {
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
    bOosDisplay: options.oosDisplay.toString(),
    bRememberBg: options.rememberBg.toString(),
    bBgChecker: options.bgChecker.toString(),
    clrBgColor: options.bgColor,
    bRemove1x1: options.remove1x1.toString(),
    nmbRTimeout: options.rTimeout.toString(),
    txtA2IfUrl: options.a2IfUrl,
    txtA2DlDirW: options.a2DlDirW.replace(/(\\|\/)$/, ''),
    txtA2DlDirP: options.a2DlDirP.replace(/(\\|\/)$/, '')
  };
}

function loadOptionsToUI() {
  const storageOptions: sicStorageOptions = {
    rxImgExtPattern: '',
    bGetAToImg: '',
    nmbThumbWidth: '',
    txtDefSearchWord: '',
    arySwHistory: '',
    numDlFilenameType: '',
    bRememberSort: '',
    txtSortColumn: '',
    txtSortOrder: '',
    bOosDisplay: '',
    bRememberBg: '',
    bBgChecker: '',
    clrBgColor: '',
    bRemove1x1: '',
    nmbRTimeout: '',
    txtA2IfUrl: '',
    txtA2DlDirW: '',
    txtA2DlDirP: ''
  }
  chrome.storage.sync.get(Object.keys(storageOptions), (result) => {
    sicOptionsOp.imgExtPattern = new RegExp(result['rxImgExtPattern']);
    sicOptionsOp.getAToImg = result['bGetAToImg'] === 'true';
    sicOptionsOp.thumbnailWidth = Number(result['nmbThumbWidth']);
    sicOptionsOp.defSearchWord = result['txtDefSearchWord'];
    sicOptionsOp.swHistory = result['arySwHistory'].replace(/,,/g, ',').split(',');
    sicOptionsOp.dlFilenameType = Number(result['numDlFilenameType']);
    sicOptionsOp.rememberSort = result['bRememberSort'] === 'true';
    sicOptionsOp.sortColmun = result['txtSortColumn'];
    sicOptionsOp.sortOrder = result['txtSortOrder'];
    sicOptionsOp.oosDisplay = result['bOosDisplay'] === 'true';
    sicOptionsOp.rememberBg = result['bRememberBg'] === 'true';
    sicOptionsOp.bgChecker = result['bBgChecker'] === 'true';
    sicOptionsOp.bgColor = result['clrBgColor'];
    sicOptionsOp.remove1x1 = result['bRemove1x1'] === 'true';
    sicOptionsOp.rTimeout = Number(result['nmbRTimeout']);
    sicOptionsOp.a2IfUrl = result['txtA2IfUrl'];
    sicOptionsOp.a2DlDirW = result['txtA2DlDirW'].replace(/(\\|\/)$/, '');
    sicOptionsOp.a2DlDirP = result['txtA2DlDirP'].replace(/(\\|\/)$/, '');

    const txtImgExtPattern = <HTMLInputElement>document.getElementById('txtImgExtPattern');
    const chkGetAToImg = <HTMLInputElement>document.getElementById('chkGetAToImg');
    const nmbThumbWidth = <HTMLInputElement>document.getElementById('nmbThumbWidth');
    const txtDefSearchWord = <HTMLInputElement>document.getElementById('txtDefSearchWord');
    const rdoDFDefault = <HTMLInputElement>document.getElementById('rdoDFDefault');
    const rdoDFPDefault = <HTMLInputElement>document.getElementById('rdoDFPDefault');
    const rdoDFPIndex = <HTMLInputElement>document.getElementById('rdoDFPIndex');
    const rdoDFUDefault = <HTMLInputElement>document.getElementById('rdoDFUDefault');
    const rdoDFUIndex = <HTMLInputElement>document.getElementById('rdoDFUIndex');
    const rdoDFTDefault = <HTMLInputElement>document.getElementById('rdoDFTDefault');
    const rdoDFTIndex = <HTMLInputElement>document.getElementById('rdoDFTIndex');
    const rdoDFDDefault = <HTMLInputElement>document.getElementById('rdoDFDDefault');
    const rdoDFDIndex = <HTMLInputElement>document.getElementById('rdoDFDIndex');
    const chkOosDisplay = <HTMLInputElement>document.getElementById('chkOosDisplay');
    const chkRememberSort = <HTMLInputElement>document.getElementById('chkRememberSort');
    const chkRememberBg = <HTMLInputElement>document.getElementById('chkRememberBg');
    const chkRemove1x1 = <HTMLInputElement>document.getElementById('chkRemove1x1');
    const nmbRTimeout = <HTMLInputElement>document.getElementById('nmbRTimeout');
    const txtA2IfUrl = <HTMLInputElement>document.getElementById('txtA2IfUrl');
    const txtA2DlDirW = <HTMLInputElement>document.getElementById('txtA2DlDirW');
    const txtA2DlDirP = <HTMLInputElement>document.getElementById('txtA2DlDirP');
  
    txtImgExtPattern.value = sicOptionsOp.imgExtPattern.source;
    chkGetAToImg.checked = sicOptionsOp.getAToImg;
    nmbThumbWidth.value = sicOptionsOp.thumbnailWidth.toString();
    txtDefSearchWord.value = sicOptionsOp.defSearchWord;
    switch(sicOptionsOp.dlFilenameType) {
      case 1:
        rdoDFPDefault.checked = true;
        break;
      case 2:
        rdoDFPIndex.checked = true;
        break;
      case 3:
        rdoDFUDefault.checked = true;
        break;
      case 4:
        rdoDFUIndex.checked = true;
        break;
      case 5:
        rdoDFTDefault.checked = true;
        break;
      case 6:
        rdoDFTIndex.checked = true;
        break;
      case 7:
        rdoDFDDefault.checked = true;
        break;
      case 8:
        rdoDFDIndex.checked = true;
        break;
      default:
        rdoDFDefault.checked = true;
        break;
    }
    chkOosDisplay.checked = sicOptionsOp.oosDisplay;
    chkRememberSort.checked = sicOptionsOp.rememberSort;
    chkRememberBg.checked = sicOptionsOp.rememberBg;
    chkRemove1x1.checked = sicOptionsOp.remove1x1;
    nmbRTimeout.value = sicOptionsOp.rTimeout.toString();
    txtA2IfUrl.value = sicOptionsOp.a2IfUrl;
    txtA2DlDirW.value = sicOptionsOp.a2DlDirW;
    txtA2DlDirP.value = sicOptionsOp.a2DlDirP;
  });
}

function saveOptionsFromUI() {
  const txtImgExtPattern = <HTMLInputElement>document.getElementById('txtImgExtPattern');
  const chkGetAToImg = <HTMLInputElement>document.getElementById('chkGetAToImg');
  const nmbThumbWidth = <HTMLInputElement>document.getElementById('nmbThumbWidth');
  const txtDefSearchWord = <HTMLInputElement>document.getElementById('txtDefSearchWord');
  const rdoDFDefault = <HTMLInputElement>document.getElementById('rdoDFDefault');
  const rdoDFPDefault = <HTMLInputElement>document.getElementById('rdoDFPDefault');
  const rdoDFPIndex = <HTMLInputElement>document.getElementById('rdoDFPIndex');
  const rdoDFUDefault = <HTMLInputElement>document.getElementById('rdoDFUDefault');
  const rdoDFUIndex = <HTMLInputElement>document.getElementById('rdoDFUIndex');
  const rdoDFTDefault = <HTMLInputElement>document.getElementById('rdoDFTDefault');
  const rdoDFTIndex = <HTMLInputElement>document.getElementById('rdoDFTIndex');
  const rdoDFDDefault = <HTMLInputElement>document.getElementById('rdoDFDDefault');
  const rdoDFDIndex = <HTMLInputElement>document.getElementById('rdoDFDIndex');
  const chkOosDisplay = <HTMLInputElement>document.getElementById('chkOosDisplay');
  const chkRememberSort = <HTMLInputElement>document.getElementById('chkRememberSort');
  const chkRememberBg = <HTMLInputElement>document.getElementById('chkRememberBg');
  const chkRemove1x1 = <HTMLInputElement>document.getElementById('chkRemove1x1');
  const nmbRTimeout = <HTMLInputElement>document.getElementById('nmbRTimeout');
  const txtA2IfUrl = <HTMLInputElement>document.getElementById('txtA2IfUrl');
  const txtA2DlDirW = <HTMLInputElement>document.getElementById('txtA2DlDirW');
  const txtA2DlDirP = <HTMLInputElement>document.getElementById('txtA2DlDirP');

  // Ext pattern as image
  const m = txtImgExtPattern.value.match(/^\/(.*)\/(.*)$/) || [];
  let rxImgExtPattern = null;
  switch(m.length) {
    case 3:
      try {
        rxImgExtPattern = new RegExp(m[1], m[2]);
      } catch(e) {
        rxImgExtPattern = Object.assign(sicDefOptionsOp.imgExtPattern);
      }
      break;
    case 2:
      try {
        rxImgExtPattern = new RegExp(m[1]);
      } catch(e) {
        rxImgExtPattern = Object.assign(sicDefOptionsOp.imgExtPattern);
      }
      break;
    default:
      rxImgExtPattern = Object.assign(sicDefOptionsOp.imgExtPattern);
      break;
  }
  sicOptionsOp.imgExtPattern = rxImgExtPattern;

  // Get atoimg (image out of page)
  sicOptionsOp.getAToImg = chkGetAToImg.checked;

  // Thumbnail width
  sicOptionsOp.thumbnailWidth = Number(nmbThumbWidth.value);

  // Default search word
  sicOptionsOp.defSearchWord = txtDefSearchWord.value;

  // Download filename
  if(rdoDFPDefault.checked) {
    sicOptionsOp.dlFilenameType = 1;
  } else if(rdoDFPIndex.checked) {
    sicOptionsOp.dlFilenameType = 2;
  } else if(rdoDFUDefault.checked) {
    sicOptionsOp.dlFilenameType = 3;
  } else if(rdoDFUIndex.checked) {
    sicOptionsOp.dlFilenameType = 4;
  } else if(rdoDFTDefault.checked) {
    sicOptionsOp.dlFilenameType = 5;
  } else if(rdoDFTIndex.checked) {
    sicOptionsOp.dlFilenameType = 6;
  } else if(rdoDFDDefault.checked) {
    sicOptionsOp.dlFilenameType = 7;
  } else if(rdoDFDIndex.checked) {
    sicOptionsOp.dlFilenameType = 8;
  } else {
    sicOptionsOp.dlFilenameType = 0;
  }

  // Out of search display
  sicOptionsOp.oosDisplay = chkOosDisplay.checked;

  // Remember sort
  sicOptionsOp.rememberSort = chkRememberSort.checked;
  if(!sicOptionsOp.rememberSort) {
    sicOptionsOp.sortColmun = '';
    sicOptionsOp.sortOrder = '';
  }

  // Remember background color of image
  sicOptionsOp.rememberBg = chkRememberBg.checked;

  // Remove 1x1 image
  sicOptionsOp.remove1x1 = chkRemove1x1.checked;

  // File read timeout
  sicOptionsOp.rTimeout = Number(nmbRTimeout.value);

  // Interface URL of Aria2
  sicOptionsOp.a2IfUrl = txtA2IfUrl.value;

  // Download directory for Aria2 (Windows)
  sicOptionsOp.a2DlDirW = txtA2DlDirW.value.replace(/(\\|\/)$/, '');

  // Download directory for Aria2 (Posix)
  sicOptionsOp.a2DlDirP = txtA2DlDirP.value.replace(/(\\|\/)$/, '');

  (async () => {
    await chrome.runtime.sendMessage({
      action: 'azo_sic_saveoptions',
      storageoptions: convertOptionsToStorageOp(sicOptionsOp)
    });
  })();
}

document.addEventListener('DOMContentLoaded', () => {
  const btnDeleteHistory = <HTMLButtonElement>document.getElementById('btnDeleteHistory');
  const btnDefault = <HTMLButtonElement>document.getElementById('btnDefault');
  const btnSave = <HTMLButtonElement>document.getElementById('btnSave');
  
  loadOptionsToUI();

  // Delete search word history
  btnDeleteHistory.addEventListener('click', function() {
    sicOptionsOp.swHistory = [];
    saveOptionsFromUI();
  });

  // Back default clicked
  btnDefault.addEventListener('click', function() {
    (async () => {
      await chrome.runtime.sendMessage({
        action: 'azo_sic_savedefoptions'
      });
    })();
    setTimeout(() => {
      loadOptionsToUI();
    }, 100);
  });

  // Save clicked
  btnSave.addEventListener('click', function() {
    saveOptionsFromUI();
  });
});

function localizeHtmlPageOp() {
  // Localize by replacing __MSG_***__ meta tags
  const objects = document.getElementsByTagName('html');
  for(let j = 0; j < objects.length; j++) {
    const obj = objects[j];
    const valStrH = obj.innerHTML.toString();
    const valNewH = valStrH.replace(/__MSG_(\w+)__/g, function(match, v1) {
      return v1 ? chrome.i18n.getMessage(v1) : '';
    });
    if(valNewH !== valStrH) {
      obj.innerHTML = valNewH;
    }
  }
}
localizeHtmlPageOp();
