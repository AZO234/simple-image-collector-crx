const sicDefOptionsOp: sicOptions = {
  imgExtPattern: new RegExp(/\.(jpg|jpeg|png|svg|gif|webp|heic|heif|avif|tif|tiff|bmp|ico|psd|raw)(\?.*)*$/i),
  getAToImg: false,
  thumbnailWidth: 128,
  rememberSort: false,
  sortColmun: '',
  sortOrder: '',
  rememberBg: true,
  bgChecker: true,
  bgColor: '#FFFFFF',
  useDownloadDir: false,
  remove1x1: true,
  rTimeout: 10000
};
const sicOptionsOp: sicOptions = Object.assign(sicDefOptionsOp);

function convertOptionsToStorageOp(options: sicOptions): sicStorageOptions {
  return {
    rxImgExtPattern: options.imgExtPattern.source,
    bGetAToImg: options.getAToImg.toString(),
    nmbThumbWidth: options.thumbnailWidth.toString(),
    bRememberSort: options.rememberSort.toString(),
    txtSortColumn: options.sortColmun,
    txtSortOrder: options.sortOrder,
    bRememberBg: options.rememberBg.toString(),
    bBgChecker: options.bgChecker.toString(),
    clrBgColor: options.bgColor,
    bUseDownloadDir: options.useDownloadDir.toString(),
    bRemove1x1: options.remove1x1.toString(),
    nmbRTimeout: options.rTimeout.toString()
  };
}

function loadOptionsToUI() {
  const storageOptions: sicStorageOptions = {
    rxImgExtPattern: '',
    bGetAToImg: '',
    nmbThumbWidth: '',
    bRememberSort: '',
    txtSortColumn: '',
    txtSortOrder: '',
    bRememberBg: '',
    bBgChecker: '',
    clrBgColor: '',
    bUseDownloadDir: '',
    bRemove1x1: '',
    nmbRTimeout: '',
  }
  chrome.storage.sync.get(Object.keys(storageOptions), (result) => {

    sicOptionsOp.imgExtPattern = new RegExp(result['rxImgExtPattern']);
    sicOptionsOp.getAToImg = result['bGetAToImg'] === 'true';
    sicOptionsOp.thumbnailWidth = Number(result['nmbThumbWidth']);
    sicOptionsOp.rememberSort = result['bRememberSort'] === 'true';
    sicOptionsOp.sortColmun = result['txtSortColumn'];
    sicOptionsOp.sortOrder = result['txtSortOrder'];
    sicOptionsOp.rememberBg = result['bRememberBg'] === 'true';
    sicOptionsOp.bgChecker = result['bBgChecker'] === 'true';
    sicOptionsOp.bgColor = result['clrBgColor'];
    sicOptionsOp.useDownloadDir = result['bUseDownloadDir'] === 'true';
    sicOptionsOp.remove1x1 = result['bRemove1x1'] === 'true';
    sicOptionsOp.rTimeout = Number(result['nmbRTimeout']);

    const txtImgExtPattern = <HTMLInputElement>document.getElementById('txtImgExtPattern');
    const chkGetAToImg = <HTMLInputElement>document.getElementById('chkGetAToImg');
    const nmbThumbWidth = <HTMLInputElement>document.getElementById('nmbThumbWidth');
    const chkRememberSort = <HTMLInputElement>document.getElementById('chkRememberSort');
    const chkRememberBg = <HTMLInputElement>document.getElementById('chkRememberBg');
    const chkUseDownloadDir = <HTMLInputElement>document.getElementById('chkUseDownloadDir');
    const chkRemove1x1 = <HTMLInputElement>document.getElementById('chkRemove1x1');
    const nmbRTimeout = <HTMLInputElement>document.getElementById('nmbRTimeout');
  
    txtImgExtPattern.value = sicOptionsOp.imgExtPattern.source;
    chkGetAToImg.checked = sicOptionsOp.getAToImg;
    nmbThumbWidth.value = sicOptionsOp.thumbnailWidth.toString();
    chkRememberSort.checked = sicOptionsOp.rememberSort;
    chkRememberBg.checked = sicOptionsOp.rememberBg;
    chkUseDownloadDir.checked = sicOptionsOp.useDownloadDir;
    chkRemove1x1.checked = sicOptionsOp.remove1x1;
    nmbRTimeout.value = sicOptionsOp.rTimeout.toString();
  });
}

function saveOptionsFromUI() {
  const txtImgExtPattern = <HTMLInputElement>document.getElementById('txtImgExtPattern');
  const chkGetAToImg = <HTMLInputElement>document.getElementById('chkGetAToImg');
  const nmbThumbWidth = <HTMLInputElement>document.getElementById('nmbThumbWidth');
  const chkRememberSort = <HTMLInputElement>document.getElementById('chkRememberSort');
  const chkRememberBg = <HTMLInputElement>document.getElementById('chkRememberBg');
  const chkUseDownloadDir = <HTMLInputElement>document.getElementById('chkUseDownloadDir');
  const chkRemove1x1 = <HTMLInputElement>document.getElementById('chkRemove1x1');
  const nmbRTimeout = <HTMLInputElement>document.getElementById('nmbRTimeout');

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

  // Remember sort
  sicOptionsOp.rememberSort = chkRememberSort.checked;
  if(!sicOptionsOp.rememberSort) {
    sicOptionsOp.sortColmun = '';
    sicOptionsOp.sortOrder = '';
  }

  // Remember background color of image
  sicOptionsOp.rememberBg = chkRememberBg.checked;

  // Use download directory
  sicOptionsOp.useDownloadDir = chkUseDownloadDir.checked;

  // Remove 1x1 image
  sicOptionsOp.remove1x1 = chkRemove1x1.checked;

  // File read timeout
  sicOptionsOp.rTimeout = Number(nmbRTimeout.value);

  (async () => {
    await chrome.runtime.sendMessage({
      action: 'azo_sic_saveoptions',
      storageoptions: convertOptionsToStorageOp(sicOptionsOp)
    });
  })();
}

document.addEventListener('DOMContentLoaded', () => {
  const btnDefault = <HTMLButtonElement>document.getElementById('btnDefault');
  const btnSave = <HTMLButtonElement>document.getElementById('btnSave');
  
  loadOptionsToUI();

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
