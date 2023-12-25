const sicDefOptionsOp: sicOptions = {
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
const sicOptionsOp = Object.assign(sicDefOptionsOp);

function convertOptionsToStorageOp(options: sicOptions): sicStorageOptions {
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

function loadOptionsOp() {
  const storageOptions: sicStorageOptions = {
    rxImgExtPattern: '',
    bGetAToImg: '',
    nmbThumbWidth: '',
    bRememberSort: '',
    txtSortColumn: '',
    txtSortOrder: '',
    bBgChecker: '',
    clrBgColor: '',
    bRemove1x1: '',
    nmbIRTimeout: '',
  }
  chrome.storage.sync.get(Object.keys(storageOptions), (result) => {
    sicOptionsOp.imgExtPattern = new RegExp(result['rxImgExtPattern']);
    sicOptionsOp.getAToImg = result['bGetAToImg'] === 'true';
    sicOptionsOp.thumbnailWidth = Number(result['nmbThumbWidth']);
    sicOptionsOp.rememberSort = result['bRememberSort'] === 'true';
    sicOptionsOp.sortColmun = result['txtSortColumn'];
    sicOptionsOp.sortOrder = result['txtSortOrder'];
    sicOptionsOp.bgChecker = result['bBgChecker'] === 'true';
    sicOptionsOp.bgColor = result['clrBgColor'];
    sicOptionsOp.remove1x1 = result['bRemove1x1'] === 'true';
    sicOptionsOp.irTimeout = Number(result['nmbIRTimeout']);
  });
}

function loadOptionsToUI() {
  const txtImgExtPattern = <HTMLInputElement>document.getElementById('txtImgExtPattern');
  const chkGetAToImg = <HTMLInputElement>document.getElementById('chkGetAToImg');
  const nmbThumbWidth = <HTMLInputElement>document.getElementById('nmbThumbWidth');
  const chkRememberSort = <HTMLInputElement>document.getElementById('chkRememberSort');
  const rdoBIChecker = <HTMLInputElement>document.getElementById('rdoBIChecker');
  const rdoBIWhite = <HTMLInputElement>document.getElementById('rdoBIWhite');
  const rdoBIBlack = <HTMLInputElement>document.getElementById('rdoBIBlack');
  const rdoBICustom = <HTMLInputElement>document.getElementById('rdoBICustom');
  const clrBIColor = <HTMLInputElement>document.getElementById('clrBIColor');
  const chkRemove1x1 = <HTMLInputElement>document.getElementById('chkRemove1x1');
  const nmbIRTimeout = <HTMLInputElement>document.getElementById('nmbIRTimeout');

  loadOptionsOp();

  txtImgExtPattern.value = sicOptionsOp.imgExtPattern.toString();
  chkGetAToImg.checked = sicOptionsOp.getAToImg;
  nmbThumbWidth.value = sicOptionsOp.thumbnailWidth.toString();
  chkRememberSort.checked = sicOptionsOp.rememberSort;
  if(sicOptionsOp.bgChecker) {
    rdoBIChecker.checked = true;
  } else if(/^white$/i.test(sicOptionsOp.bgColor) || /^#(FFF|FFFFFF)$/i.test(sicOptionsOp.bgColor)) {
    rdoBIWhite.checked = true;
  } else if(/^black$/i.test(sicOptionsOp.bgColor) || /^#(000|000000)$/.test(sicOptionsOp.bgColor)) {
    rdoBIBlack.checked = true;
  } else {
    rdoBICustom.checked = true;
  }
  clrBIColor.value = sicOptionsOp.bgColor;
  chkRemove1x1.checked = sicOptionsOp.remove1x1;
  nmbIRTimeout.value = sicOptionsOp.irTimeout.toString();
}

function saveOptionsFromUI() {
  const txtImgExtPattern = <HTMLInputElement>document.getElementById('txtImgExtPattern');
  const chkGetAToImg = <HTMLInputElement>document.getElementById('chkGetAToImg');
  const nmbThumbWidth = <HTMLInputElement>document.getElementById('nmbThumbWidth');
  const chkRememberSort = <HTMLInputElement>document.getElementById('chkRememberSort');
  const rdoBIChecker = <HTMLInputElement>document.getElementById('rdoBIChecker');
  const rdoBIWhite = <HTMLInputElement>document.getElementById('rdoBIWhite');
  const rdoBIBlack = <HTMLInputElement>document.getElementById('rdoBIBlack');
  const rdoBICustom = <HTMLInputElement>document.getElementById('rdoBICustom');
  const clrBIColor = <HTMLInputElement>document.getElementById('clrBIColor');
  const chkRemove1x1 = <HTMLInputElement>document.getElementById('chkRemove1x1');
  const nmbIRTimeout = <HTMLInputElement>document.getElementById('nmbIRTimeout');

  // Ext pattern as image
  let rxImgExtPattern = Object.assign(sicDefOptionsOp.imgExtPattern);
  try {
    if(txtImgExtPattern.value) {
      rxImgExtPattern = new RegExp(txtImgExtPattern.value);
    }
  } catch(e) {
    rxImgExtPattern = Object.assign(sicDefOptionsOp.imgExtPattern);
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

  // Background of image
  sicOptionsOp.bgChecker = rdoBIChecker.checked;
  let bgColor = '#FFFFFF';
  if(clrBIColor.value) {
    bgColor = clrBIColor.value;
  }
  if(rdoBIWhite.checked) {
    bgColor = '#FFFFFF';
  } else if(rdoBIBlack.checked) {
    bgColor = '#000000';
  }
  sicOptionsOp.bgColor = bgColor;

  // Remove 1x1 image
  sicOptionsOp.remove1x1 = chkRemove1x1.checked;

  // File read timeout
  sicOptionsOp.irTimeout = Number(nmbIRTimeout.value);

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
    loadOptionsToUI();
  });

  // Save clicked
  btnSave.addEventListener('click', function() {
    saveOptionsFromUI();
  });
});
