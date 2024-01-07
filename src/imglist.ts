const sicDefOptionsImgList: sicOptions = {
  imgExtPattern: new RegExp(/\.(jpg|jpeg|png|svg|gif|webp|heic|heif|avif|tif|tiff|bmp|ico|psd|raw)(\?.*)*$/i),
  getAToImg: false,
  thumbnailWidth: 128,
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
const sicOptionsImgList: sicOptions = Object.assign(sicDefOptionsImgList);

function convertOptionsToStorageImgList(options: sicOptions): sicStorageOptions {
  return {
    rxImgExtPattern: options.imgExtPattern.source,
    bGetAToImg: options.getAToImg.toString(),
    nmbThumbWidth: options.thumbnailWidth.toString(),
    bRememberSort: options.rememberSort.toString(),
    txtSortColumn: options.sortColmun,
    txtSortOrder: options.sortOrder,
    bOosDisplay: options.oosDisplay.toString(),
    bRememberBg: options.rememberSort.toString(),
    bBgChecker: options.bgChecker.toString(),
    clrBgColor: options.bgColor,
    bUseDownloadDir: options.useDownloadDir.toString(),
    bRemove1x1: options.remove1x1.toString(),
    nmbRTimeout: options.rTimeout.toString()
  };
}

function loadOptionsImgList(message: any) {
  const storageOptions: sicStorageOptions = convertOptionsToStorageImgList(sicOptionsImgList);
  chrome.storage.sync.get(Object.keys(storageOptions), (result) => {
    sicOptionsImgList.imgExtPattern = new RegExp(result['rxImgExtPattern']);
    sicOptionsImgList.getAToImg = result['bGetAToImg'] === 'true';
    sicOptionsImgList.thumbnailWidth = Number(result['nmbThumbWidth']);
    sicOptionsImgList.rememberSort = result['bRememberSort'] === 'true';
    sicOptionsImgList.sortColmun = result['txtSortColumn'];
    sicOptionsImgList.sortOrder = result['txtSortOrder'];
    sicOptionsImgList.oosDisplay = result['bOosDisplay'] === 'true';
    sicOptionsImgList.bgChecker = result['bBgChecker'] === 'true';
    sicOptionsImgList.bgColor = result['clrBgColor'];
    sicOptionsImgList.useDownloadDir = result['bUseDownloadDir'] === 'true';
    sicOptionsImgList.remove1x1 = result['bRemove1x1'] === 'true';
    sicOptionsImgList.rTimeout = Number(result['nmbRTimeout']);

    start(message.title, message.url, message.sicitems);
  });
}

const sicItemsImgList: sicItem[] = [];

let searchText = '';

let selectedCount = 0;

// Index of the row where indeterminate selection
let indeterminateIndex = [-1, -1];

async function getImageInfo(item: sicItem, timeout = 10000): Promise<number> {
  return new Promise(async (resolve) => {
    if (!item.image) {
      resolve(1);
      return;
    }
    if(/^data:/i.test(item.image.url)) {
      console.log(`gii: Url is data. ${item.image.url}`);
      resolve(2);
      return;
    }

    const img = new Image();

    // Set up AbortController
    const timerController = new AbortController();
    const timer = setTimeout(() => {
      timerController.abort();
      console.log(`gii: Image loading timed out ${img.src}`);
      resolve(5);
    }, timeout);

    // Wait for load to img
    img.onload = async () => {
      if (!item.image) {
        resolve(3);
        return;
      }

      try {
        const response = await fetch(item.image.url, { signal: timerController.signal });
        const blob = await response.blob();

        const fileReaderResult = await new Promise<ArrayBuffer>((resolve, reject) => {
          const fileReader = new FileReader();
          fileReader.onloadend = () => resolve(fileReader.result as ArrayBuffer);
          fileReader.onerror = reject;
          fileReader.readAsArrayBuffer(blob);
        });

        clearTimeout(timer);

        const arr = new Uint8Array(fileReaderResult).subarray(0, 4);
        let header = '';
        for (let i = 0; i < arr.length; i++) {
          header += arr[i].toString(16);
        }

        // JPEG
        if (/^ffd8/.test(header)) {
          header = 'ffd8';
        }

        // MIME type determination logic
        switch (header) {
          case '424d':
            item.image.mime = 'image/bmp';
            break;
          case '47494638':
            item.image.mime = 'image/gif';
            break;
          case '49492a00':
            item.image.mime = 'image/tiff(LE)';
            break;
          case '4d4d002a':
            item.image.mime = 'image/tiff(BE)';
            break;
          case '52494646':
            item.image.mime = 'image/webp';
            break;
          case '89504e47':
            item.image.mime = 'image/png';
            break;
          case 'ffd8':
            item.image.mime = 'image/jpeg';
            break;
          default:
            item.image.mime = '';
            break;
        }

        item.image.width = img.width;
        item.image.height = img.height;

        resolve(0);
      } catch (error) {
        console.log(`gii: Error occurred during image data retrieval or processing ${item.image.url}`);
        resolve(4);
      }
    };

    img.src = item.image.url;
  });
}

chrome.runtime.onMessage.addListener((message) => {
  switch(message.action) {
    case 'azo_sic_sendlist':
      // load options
      loadOptionsImgList(message);
      break;
  }
});

async function start(title: string, url: string, sicWorkItems: sicItem[]) {
  // Background color of image
  const rdoBgChecker = <HTMLInputElement>document.getElementById('rdoBgChecker');
  const rdoBgColor = <HTMLInputElement>document.getElementById('rdoBgColor');
  const clrBgColor = <HTMLInputElement>document.getElementById('clrBgColor');
  if(sicOptionsImgList.rememberBg) {
    if(sicOptionsImgList.bgChecker) {
      rdoBgChecker.checked = true;
    } else {
      rdoBgColor.checked = true;
    }
  } else {
    rdoBgChecker.checked = true;
  }
  clrBgColor.value = sicOptionsImgList.bgColor;

  // title
  document.title = 'sic:' + title;

  // title ('h' tag)
  const hListTitle = document.getElementById('listtitle');
  if(hListTitle) {
    hListTitle.innerHTML = `
      <i class="bi bi-image"></i> Images in :<br>
      <a class="link-underline link-underline-opacity-0 link-underline-opacity-100-hover" href="${url}" target="_blank">${title}</a>`;
  }

  // setup items
  const loadImageProms: Promise<number>[] = [];
  for(const item of sicWorkItems) {
    if(!/svg/i.test(item.tag) && item.image) {
      loadImageProms.push(getImageInfo(item, sicOptionsImgList.rTimeout));
    }
  }
  await Promise.all(loadImageProms);

  for(const item of sicWorkItems) {
    if(item.image) {
      if(sicOptionsImgList.remove1x1) {
        if(!(item.image && (item.image.width === 1 && item.image.height === 1))) {
          sicItemsImgList.push(item);
        }
      } else {
        sicItemsImgList.push(item);
      }
    } else {
      sicItemsImgList.push(item);
    }
  }

  // disapear loading
  const loading = <HTMLDivElement>document.getElementById('loading');
  loading.style.display = 'none';
  
  // Add event listeners for header clicks
  document.querySelectorAll('th[data-sort]').forEach(header => {
    header.addEventListener('click', () => {
      const column = header.getAttribute('data-sort');
      headerClick(column);
    });
  });

  // Initial table rendering
  updateTable();

  // sort
  if(sicOptionsImgList.rememberSort && sicOptionsImgList.sortColmun !== '') {
    sicOptionsImgList.sortOrder = (sicOptionsImgList.sortOrder === 'asc') ? 'desc' : 'asc';
    headerClick(sicOptionsImgList.sortColmun);
  }
}

function getItemFromIndex(index: number): sicItem {
  let i;
  for(i = 0; i < sicItemsImgList.length; i++) {
    if(index === sicItemsImgList[i].index) {
      break;
    }
  }
  return sicItemsImgList[i];
}

function updateSelectedCount() {
  const btnAction = <HTMLButtonElement>document.getElementById('btnAction');
  const nmbSelectedCount = <HTMLSpanElement>document.getElementById('nmbSelectedCount');
  const btnClear = <HTMLButtonElement>document.getElementById('btnClear');

  if(selectedCount) {
    nmbSelectedCount.style.display = 'inline-block';
    nmbSelectedCount.textContent = selectedCount.toString();
    btnAction.disabled = false;
    btnClear.disabled = false;
  } else {
    nmbSelectedCount.style.display = 'none';
    nmbSelectedCount.textContent = '0';
    btnAction.disabled = true;
    btnClear.disabled = true;
  }
}

function updateRow(item: sicItem) {
  const row = <HTMLTableRowElement>document.getElementById('row_' + item.index);
  const cols = row.children;

  // column: ID
  const col = <HTMLTableCellElement>cols[0];
  col.classList.add('text-end');
  col.textContent = item.index.toString();

  // column: Chk
  const check = <HTMLInputElement>cols[1].children[0];
  check.indeterminate = false;
  check.checked = false;
  row.style.display = '';
  row.classList.remove('table-secondary', 'table-danger', 'table-warning');
  if(item.check & 0b100) {
    row.classList.remove('table-secondary', 'table-danger', 'table-warning');
    row.classList.add('table-warning');
    check.indeterminate = true;
  }
  if(item.check & 0b010) {
    row.classList.remove('table-secondary', 'table-danger', 'table-warning');
    row.classList.add('table-danger');
    check.indeterminate = false;
    check.checked = true;
  }
  if(!(item.check & 0b001)) {
    row.classList.remove('table-secondary', 'table-danger', 'table-warning');
    row.classList.add('table-secondary');
    if(!sicOptionsImgList.oosDisplay) {
      row.style.display = 'none';
    }
  }
  if((item.check & 0b110) && (item.check & 0b001)) {
    selectedCount++;
  };
  
  // column: Tag
  cols[2].textContent = item.tag;

  // column Type
  cols[3].textContent = item.type;

  // column MIME
  if(item.image) {
    if(/^image\//i.test(item.image.mime)) {
      cols[4].innerHTML = '<img src="images/image.png" width="16" alt="image">' + item.image.mime;
    } else {
      cols[4].textContent = item.image.mime;
    }
  } else {
    cols[4].textContent = '';
  }

  // column URL&Info
  let displayURL = item.url;
  if(displayURL.length > 64) {
    displayURL = displayURL.replace(/(^.{32}).*(.{32}$)/, "$1 ... $2");
  }
  if(item.iframeIndex || item.iframeDepth) {
    if(item.image) {
      if(item.tag === 'SVG') {
        if(/width\s*=\s*['"]?\d+['"]?/i.test(item.image.data)) {
          item.image.data = item.image.data.replace(/width\s*=\s*['"]?\d+['"]?/i, `width="${sicOptionsImgList.thumbnailWidth}"`);
        } else {
          item.image.data = item.image.data.replace(/(<svg )/i, `$1width="${sicOptionsImgList.thumbnailWidth}" `);
        }
        item.image.data = item.image.data.replace(/height\s*=\s*['"]?\d+['"]?/i, '');
        cols[5].innerHTML = `
        <div class="container-fluid ms-2">
          <div class="row">
            <div class="col-6 col-lg-3 img-thumbnail" data-bs-toggle="modal" data-bs-target="#modal" data-img-url="" data-img-data="${encodeURI(item.image.data)}" style="background: ${sicOptionsImgList.bgChecker ? 'url(\'images/checker.svg\')' : sicOptionsImgList.bgColor};">
              ${item.image.data}
            </div>  
            <div class="col-6 col-lg-9 text-start">
              ${item.iframeIndex ? '<br>iframe: ' + item.iframeIndex : ''}
              ${item.iframeDepth ? '<br>depth: ' + item.iframeDepth : ''}
              ${item.image.inCSS ? '<br>in CSS' : ''}
            </div>
          </div>
        </div>`;
      } else {
        cols[5].innerHTML = `
        <div class="container-fluid ms-2">
          <div class="row">
            <div class="col-6 col-lg-3 img-thumbnail" data-bs-toggle="modal" data-bs-target="#modal" data-img-url="${item.image.url}" data-img-data="" style="background: ${sicOptionsImgList.bgChecker ? 'url(\'images/checker.svg\')' : sicOptionsImgList.bgColor};">
              <img src="${item.image.url}" width="${sicOptionsImgList.thumbnailWidth}" alt="thumbnail">
            </div>  
            <div class="col-6 col-lg-9 text-start">
              ${item.image.width}x${item.image.height}
              ${item.iframeIndex ? '<br>iframe: ' + item.iframeIndex : ''}
              ${item.iframeDepth ? '<br>depth: ' + item.iframeDepth : ''}
              ${item.image.inCSS ? '<br>in CSS' : ''}
            </div>
          </div>
          <div class="row">
            <div class="col-12 text-start">
              <a class="link-underline link-underline-opacity-0 link-underline-opacity-100-hover" href="${item.url}" target="_blank">${displayURL}</a>
            </div>
          </div>
        </div>`;
      }
    } else {
      cols[5].innerHTML = `
      <div class="container-fluid ms-2">
        <div class="row">
          <div class="col-12 text-start">
            ${item.iframeIndex ? '<br>iframe: ' + item.iframeIndex : ''}
            ${item.iframeDepth ? '<br>depth: ' + item.iframeDepth : ''}
          </div>
        </div>
        <div class="row">
          <div class="col-12 text-start">
            <a class="link-underline link-underline-opacity-0 link-underline-opacity-100-hover" href="${item.url}" target="_blank">${displayURL}</a>
          </div>
        </div>
      </div>`;
    }
  } else {
    if(item.image) {
      if(item.tag === 'SVG') {
        if(/width\s*=\s*['"]?\d+['"]?/i.test(item.image.data)) {
          item.image.data = item.image.data.replace(/width\s*=\s*['"]?\d+['"]?/i, `width="${sicOptionsImgList.thumbnailWidth}"`);
        } else {
          item.image.data = item.image.data.replace(/(<svg )/i, `$1width="${sicOptionsImgList.thumbnailWidth}" `);
        }
        item.image.data = item.image.data.replace(/height\s*=\s*['"]?\d+['"]?/i, '');
        cols[5].innerHTML = `
        <div class="container-fluid ms-2">
          <div class="row">
            <div class="col-6 col-lg-3 img-thumbnail" data-bs-toggle="modal" data-bs-target="#modal" data-img-url="" data-img-data="${encodeURI(item.image.data)}" style="background: ${sicOptionsImgList.bgChecker ? 'url(\'images/checker.svg\')' : sicOptionsImgList.bgColor};">
              ${item.image.data}
            </div>  
            <div class="col-6 col-lg-9 text-start">
              ${item.image.inCSS ? '<br>in CSS' : ''}
            </div>
          </div>
        </div>`;
      } else {
        cols[5].innerHTML = `
        <div class="container-fluid ms-2">
          <div class="row">
            <div class="col-6 col-lg-3 img-thumbnail" data-bs-toggle="modal" data-bs-target="#modal" data-img-url="${item.image.url}" data-img-data="" style="background: ${sicOptionsImgList.bgChecker ? 'url(\'images/checker.svg\')' : sicOptionsImgList.bgColor};">
              <img src="${item.image.url}" width="${sicOptionsImgList.thumbnailWidth}" alt="thumbnail">
            </div>
            <div class="col-6 col-lg-9 text-start">
              ${item.image.width}x${item.image.height}
              ${item.image.inCSS ? '<br>in CSS' : ''}
            </div>
          </div>
          <div class="row">
            <div class="col-12 text-start">
              <a class="link-underline link-underline-opacity-0 link-underline-opacity-100-hover" href="${item.url}" target="_blank">${displayURL}</a>
            </div>
          </div>
        </div>`;
      }
    } else {
      cols[5].innerHTML = `
        <div class="row">
          <div class="col-12 text-start">
            <a class="link-underline link-underline-opacity-0 link-underline-opacity-100-hover" href="${item.url}" target="_blank">${displayURL}</a>
          </div>
        </div>`;
    }
  }
 
  // set modal
  const modalimg = <HTMLDivElement>document.getElementById('modal-image') || null;
  if(modalimg) {
    const imgs = cols[5].getElementsByTagName('img');
    if(imgs && imgs.length > 0) {
      const img = <HTMLImageElement>imgs[0];
      if(img.parentElement) {
        img.parentElement.addEventListener('click', function () {
          modalimg.style.background = sicOptionsImgList.bgChecker ? 'url(\'images/checker.svg\')' : sicOptionsImgList.bgColor;
          modalimg.innerHTML = `<img src="${this.getAttribute('data-img-url')}" alt="original image">`;
        });
      }
    } else {
      const svgs = cols[5].getElementsByTagName('svg');
      if(svgs && svgs.length > 0) {
        const svg = <SVGSVGElement>svgs[0];
        if(svg.parentElement) {
          svg.parentElement.addEventListener('click', function () {
            modalimg.style.background = sicOptionsImgList.bgChecker ? 'url(\'images/checker.svg\')' : sicOptionsImgList.bgColor;
            modalimg.innerHTML = decodeURI(this.getAttribute('data-img-data') || '');
          });
        }
      }
    }
  }
}

function addRow(item: sicItem) {
  const tableBody = document.getElementById('table-body');
  if(tableBody) {
    const row = <HTMLTableRowElement>document.createElement('tr');
    row.id = 'row_' + item.index;
    for(let i = 0; i < 6; i++) {
      const col = <HTMLTableCellElement>document.createElement('td');
      row.appendChild(col);
    }

    const col0 = <HTMLTableCellElement>row.children[0];
    col0.addEventListener('click', function() {
      const row = <HTMLDivElement>this.parentElement;
      const index = Number(row.id.replace(/row_(\d+$)/, "$1"));
      const item = getItemFromIndex(index);
      idClick(item);
      return false;
    });

    const check = <HTMLInputElement>document.createElement('input');
    check.type = 'checkbox';
    check.classList.add('form-check-input');
    check.addEventListener('click', function() {
      const col = <HTMLTableCellElement>this.parentElement;
      const row = <HTMLTableRowElement>col.parentElement;
      const index = Number(row.id.replace(/row_(\d+$)/, "$1"));
      const item = getItemFromIndex(index);
      if((item.check & 0b110) && (item.check & 0b001)) {
        selectedCount--;
      }
      item.check ^= 0b010;
      updateRow(item);
      updateSelectedCount();
    });
    row.children[1].appendChild(check);

    // search
    let bFound = true;
    item.check |= 0b001;
    if(searchText !== '') {
      bFound = false;

      // RegExp
      if(/^\/.*\//.test(searchText)) {
        const m = searchText.match(/^\/(.*)\/(.*?)$/) || [];
        let re = null;
        switch(m.length) {
          case 3:
            try {
              re = new RegExp(m[1], m[2]);
            } catch(e) {
              re = new RegExp('');
            }
            break;
          case 2:  
            try {
              re = new RegExp(m[1]);
            } catch(e) {
              re = new RegExp('');
            }
            break;
          default:  
            re = new RegExp('');
        }
        if(
          re.test(item.tag) ||
          re.test(item.type) ||
          re.test(item.url)
        ) {
          bFound = true;
        }
        if(item.image && (
          re.test(item.image.type) ||
          re.test(item.image.mime) ||
          re.test(item.image.url) ||
          re.test(item.image.data)
        )) {
          bFound = true;
        }
      } else {
        if(
          item.tag.includes(searchText) ||
          item.type.includes(searchText) ||
          item.url.includes(searchText)
        ) {
          bFound = true;
        }
        if(item.image && (
          item.image.type.includes(searchText) ||
          item.image.mime.includes(searchText) ||
          item.image.url.includes(searchText) ||
          item.image.data.includes(searchText)
        )) {
          bFound = true;
        }
      }
      if(!bFound) {
        item.check &= 0b110;
      }
    }

    if(bFound || sicOptionsImgList.oosDisplay) {
      tableBody.appendChild(row);
      updateRow(item);
    }
  }
}

// Function to render table rows
function updateTable() {
  const tableBody = document.getElementById('table-body');

  selectedCount = 0;

  if(tableBody) {
    tableBody.innerHTML = '';
    for(const item of sicItemsImgList) {
      addRow(item);
    }
  }

  updateSelectedCount();
}

// Handle ID cell click
function idClick(item: sicItem) {
  // indeterminate select
  if(indeterminateIndex[0] < 0) {
    indeterminateIndex[0] = item.index;
    item.check |= 0b100;
    updateRow(item);
    updateSelectedCount();
  } else {
    let i = 0;
    if(indeterminateIndex[1] < 0) {
      // indeterminate single cancel
      if(indeterminateIndex[0] === item.index) {
        indeterminateIndex = [-1, -1];
        item.check &= 0b011;
        updateRow(item);
        updateSelectedCount();
      // indeterminate select between start and end
      } else {
        let state = 0;
        indeterminateIndex[1] = item.index;
        for(i = 0; i < sicItemsImgList.length; i++) {
          switch(state) {
            case 0:
              if(sicItemsImgList[i].index === indeterminateIndex[0] || sicItemsImgList[i].index === indeterminateIndex[1]) {
                if(sicOptionsImgList.oosDisplay || (sicItemsImgList[i].check & 0b001)) {
                  sicItemsImgList[i].check |= 0b100;
                  state++;
                }
              }
              break;
            case 1:
              sicItemsImgList[i].check |= 0b100;
              if(sicItemsImgList[i].index === indeterminateIndex[0] || sicItemsImgList[i].index === indeterminateIndex[1]) {
                if(sicOptionsImgList.oosDisplay || (sicItemsImgList[i].check & 0b001)) {
                  sicItemsImgList[i].check |= 0b100;
                  state++;
                }
              }
              break;
            case 2:
              break;
          }
        }
        updateTable();
      }
    } else {
      // add indeterminate select
      if((item.check & 0b100) === 0) {
        if(!(sicItemsImgList[i].check & 0b001)) {
          item.check |= 0b100;
        }
        updateRow(item);
        updateSelectedCount();
      // cancel indeterminate select all
      } else {
        indeterminateIndex = [-1, -1];
        for(i = 0; i < sicItemsImgList.length; i++) {
          sicItemsImgList[i].check &= 0b011;
        }
        updateTable();
      }
    }
  }
}

// Handle table header click
function headerClick(column: string | null): void {
  if(column) {
    if (sicOptionsImgList.sortColmun === column) {
      sicOptionsImgList.sortOrder = (sicOptionsImgList.sortOrder === 'asc') ? 'desc' : 'asc';
    } else {
      sicOptionsImgList.sortColmun = column;
      sicOptionsImgList.sortOrder = 'asc';
    }
    if(sicOptionsImgList.rememberSort) {
      (async () => {
        await chrome.runtime.sendMessage({
          action: 'azo_sic_saveoptions',
          storageoptions: convertOptionsToStorageImgList(sicOptionsImgList)
        });
      })();
    }
  }

  // Apply sort icon
  document.querySelectorAll('th i').forEach(icon => icon.classList.remove('bi-sort-alpha-down', 'bi-sort-alpha-up'));
  const sortIcon = document.querySelector(`th[data-sort="${column}"] i`);
  if(sortIcon) {
    sortIcon.classList.add(`bi-sort-${sicOptionsImgList.sortOrder === 'asc' ? 'alpha-down' : 'alpha-up'}`);
  }

  // compare 3-state checkbox
  const compareChecks = (a: number, b: number, ascending: boolean = true): number => {
    const priorityOrder = [0b001, 0b010, 0b100];
  
    const order = ascending ? 1 : -1;
  
    const checkEnable = (a & 0b001) - (b & 0b001);
    if(checkEnable !== 0) {
      return order * checkEnable;
    }
    const checkComparison = ((a & 0b010) >> 1) - ((b & 0b010) >> 1);
    if (checkComparison !== 0) {
      return order * checkComparison;
    }
    const indeterminateComparison = ((a & 0b100) >> 2) - ((b & 0b100) >> 2);
    if (indeterminateComparison !== 0) {
      return order * indeterminateComparison;
    }
  
    return order * (priorityOrder.indexOf(a) - priorityOrder.indexOf(b));
  };
  
  // Sort the data and re-render the table
  sicItemsImgList.sort((a, b): number => {
    const aImgMime = a.image ? a.image.mime : '';
    const bImgMime = b.image ? b.image.mime : '';
    if (column === 'id') {
      return (sicOptionsImgList.sortOrder === 'asc') ? a.index - b.index : b.index - a.index;
    } else if (column === 'chk') {
      return (sicOptionsImgList.sortOrder === 'asc') ? compareChecks(a.check, b.check, true) : compareChecks(a.check, b.check, false);
    } else if (column === 'tag') {
      return (sicOptionsImgList.sortOrder === 'asc') ? a.tag.localeCompare(b.tag) : b.tag.localeCompare(a.tag);
    } else if (column === 'type') {
      return (sicOptionsImgList.sortOrder === 'asc') ? a.type.localeCompare(b.type) : b.type.localeCompare(a.type);
    } else if (column === 'mime') {
      return (sicOptionsImgList.sortOrder === 'asc') ? aImgMime.localeCompare(bImgMime) : bImgMime.localeCompare(aImgMime);
    } else if (column === 'url') {
      return (sicOptionsImgList.sortOrder === 'asc') ? a.url.localeCompare(b.url) : b.url.localeCompare(a.url);
    } 
    return 0;
  });

  updateTable();
}

document.addEventListener('DOMContentLoaded', () => {
  // initialize Popper.js for Bootstrap
  const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
  const popoverList = [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));
  const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
  const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
  console.log(popoverList);  // temp
  console.log(tooltipList);  // temp

  const btnDownload = <HTMLButtonElement>document.getElementById('btnDownload');
  const btnCopy = <HTMLButtonElement>document.getElementById('btnCopy');
  const btnSendToAria2 = <HTMLButtonElement>document.getElementById('btnSendToAria2');
  const btnClear = <HTMLButtonElement>document.getElementById('btnClear');
  const txtSearch = <HTMLInputElement>document.getElementById('txtSearch');
  const rdoBgChecker = <HTMLInputElement>document.getElementById('rdoBgChecker');
  const rdoBgColor = <HTMLInputElement>document.getElementById('rdoBgColor');
  const clrBgColor = <HTMLInputElement>document.getElementById('clrBgColor');
  const btnOptions = <HTMLButtonElement>document.getElementById('btnOptions');
  const btnToTop = <HTMLButtonElement>document.getElementById('btnToTop');
  const btnToBottom = <HTMLButtonElement>document.getElementById('btnToBottom');

  btnDownload.addEventListener('click', function () {
    const proms: Promise<number>[] = [];
    for(const item of sicItemsImgList) {
      if((item.check & 0b110) && (item.check & 0b001) && item.tag !== 'SVG') {
        const options: chrome.downloads.DownloadOptions = {
          url: item.url
        }
        if(sicOptionsImgList.useDownloadDir) {
          options.saveAs = false;
        }
        proms.push(chrome.downloads.download(options));
      }
    }
    Promise.all(proms);

    indeterminateIndex = [-1, -1];
    for(let i = 0; i < sicItemsImgList.length; i++) {
      sicItemsImgList[i].check &= 0b011;
    }
  });
  btnCopy.addEventListener('click', function () {
    let text = '';
    for(const item of sicItemsImgList) {
      if((item.check & 0b110) && (item.check & 0b001) && item.tag !== 'SVG') {
        if(text === '') {
          text += item.url;
        } else {
          text += '\n' + item.url;
        }
      }
    }
    if(text !== '') {
      (async () => {
        navigator.clipboard.writeText(text);
      })();
    }
  });
  btnSendToAria2.addEventListener('click', function () {
    const proms: Promise<any>[] = [];
    for(const item of sicItemsImgList) {
      if((item.check & 0b110) && (item.check & 0b001) && item.tag !== 'SVG') {
        proms.push(chrome.runtime.sendMessage('mpkodccbngfoacfalldjimigbofkhgjn', { url: item.url }));
      }
    }
    Promise.all(proms);

    indeterminateIndex = [-1, -1];
    for(let i = 0; i < sicItemsImgList.length; i++) {
      sicItemsImgList[i].check &= 0b011;
    }
  });

  btnClear.addEventListener('click', function () {
    for(const item of sicItemsImgList) {
      item.check &= 0b001;
    }
    updateTable();
  });

  txtSearch.addEventListener('input', function () {
    searchText = this.value;
    updateTable();
  });

  rdoBgChecker.addEventListener('click', function () {
    sicOptionsImgList.bgChecker = true;
    if(sicOptionsImgList.rememberBg) {
      (async () => {
        await chrome.runtime.sendMessage({
          action: 'azo_sic_saveoptions',
          storageoptions: convertOptionsToStorageImgList(sicOptionsImgList)
        });
      })();
    }
    updateTable();
  });
  rdoBgColor.addEventListener('click', function () {
    sicOptionsImgList.bgChecker = false;
    if(sicOptionsImgList.rememberBg) {
      (async () => {
        await chrome.runtime.sendMessage({
          action: 'azo_sic_saveoptions',
          storageoptions: convertOptionsToStorageImgList(sicOptionsImgList)
        });
      })();
    }
    updateTable();
  });
  clrBgColor.addEventListener('change', function () {
    sicOptionsImgList.bgColor = clrBgColor.value;
    if(sicOptionsImgList.rememberBg) {
      (async () => {
        await chrome.runtime.sendMessage({
          action: 'azo_sic_saveoptions',
          storageoptions: convertOptionsToStorageImgList(sicOptionsImgList)
        });
      })();
    }
    if(!sicOptionsImgList.bgChecker) {
      updateTable();
    }
  });

  btnOptions.addEventListener('click', function () {
    chrome.runtime.openOptionsPage();
  });

  btnToTop.addEventListener('click', function () {
    window.scrollTo(0, 0);
  });
  btnToBottom.addEventListener('click', function () {
    window.scrollTo(0, document.body.scrollHeight);
  });
});
