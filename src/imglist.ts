const sicDefOptionsImgList: sicOptions = {
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
const sicOptionsImgList: sicOptions = Object.assign(sicDefOptionsImgList);

function convertOptionsToStorageImgList(options: sicOptions): sicStorageOptions {
  return {
    rxImgExtPattern: options.imgExtPattern.source,
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

function loadOptionsImgList(message: any) {
  const storageOptions: sicStorageOptions = convertOptionsToStorageImgList(sicOptionsImgList);
  chrome.storage.sync.get(Object.keys(storageOptions), (result) => {
    sicOptionsImgList.imgExtPattern = new RegExp(result['rxImgExtPattern']);
    sicOptionsImgList.getAToImg = result['bGetAToImg'] === 'true';
    sicOptionsImgList.thumbnailWidth = Number(result['nmbThumbWidth']);
    sicOptionsImgList.rememberSort = result['bRememberSort'] === 'true';
    sicOptionsImgList.sortColmun = result['txtSortColumn'];
    sicOptionsImgList.sortOrder = result['txtSortOrder'];
    sicOptionsImgList.bgChecker = result['bBgChecker'] === 'true';
    sicOptionsImgList.bgColor = result['clrBgColor'];
    sicOptionsImgList.remove1x1 = result['bRemove1x1'] === 'true';
    sicOptionsImgList.irTimeout = Number(result['nmbIRTimeout']);

    start(message.title, message.url, message.sicitems);
  });
}

const sicItemsImgList: sicItem[] = [];

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

  // title
  document.title = 'sic:' + title;

  // title ('h' tag)
  const hListTitle = document.getElementById('listtitle');
  if(hListTitle) {
    hListTitle.innerHTML = `
      <i class="bi bi-image"></i> Images in :<br>
      <a href="${url}" target="_blank">${title}</a>`;
  }

  // setup items
  const loadImageProms: Promise<number>[] = [];
  for(const item of sicWorkItems) {
    if(!/svg/i.test(item.tag) && item.image) {
      loadImageProms.push(getImageInfo(item, sicOptionsImgList.irTimeout));
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
  if(sicOptionsImgList.rememberSort) {
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

function selectRow(item: sicItem) {
  const row = <HTMLTableRowElement>document.getElementById('row_' + item.index);
  row.classList.remove('checked-row', 'indeterminate-row');
  if ((item.check & 1) === 1) {
    row.classList.add('checked-row');
    const check = <HTMLInputElement>row.children[1].children[0];
    check.checked = true;
  } else if ((item.check & 2) === 2) {
    row.classList.add('indeterminate-row');
    const check = <HTMLInputElement>row.children[1].children[0];
    check.indeterminate = true;
  }
}

function updateRow(item: sicItem) {
  const row = <HTMLTableRowElement>document.getElementById('row_' + item.index);
  const cols = row.children;

  // column: ID
  const col = <HTMLTableCellElement>cols[0];
  col.classList.add('text-end');
  col.textContent = item.index.toString();
  col.addEventListener('click', function() {
    const row = <HTMLDivElement>this.parentElement;
    const index = Number(row.id.replace(/row_(\d$)/, "$1"));
    idClick(sicItemsImgList[index]);
  });

  // column: Chk
  cols[1].innerHTML = '';
  const check = document.createElement('input');
  check.type = 'checkbox';
  check.classList.add('form-check-input');
  check.addEventListener('click', function() {
    const col = <HTMLTableCellElement>this.parentElement;
    const row = <HTMLTableRowElement>col.parentElement;
    const index = Number(row.id.replace(/row_(\d$)/, "$1"));
    const item = sicItemsImgList[index];
    item.check ^= 1;
    selectRow(item);
  });
  cols[1].appendChild(check)
  selectRow(item);

  // column: Tag
  cols[2].textContent = item.tag;

  // column Type
  cols[3].textContent = item.type;

  // column MIME
  if(item.image) {
    if(/^image\//.test(item.image.mime)) {
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
        if(/width\s*=\s*['"]?\d+['"]?/.test(item.image.data)) {
          item.image.data = item.image.data.replace(/width\s*=\s*['"]?\d+['"]?/, `width="${sicOptionsImgList.thumbnailWidth}"`);
        } else {
          item.image.data = item.image.data.replace(/(<svg )/i, `$1width="${sicOptionsImgList.thumbnailWidth}" `);
        }
        item.image.data = item.image.data.replace(/height\s*=\s*['"]?\d+['"]?/, '');
        cols[5].innerHTML = `
        <div class="row">
          <div class="col-3 col-md-6 img-thumbnail" style="background: ${sicOptionsImgList.bgChecker ? 'url(\'images/checker.svg\')' : sicOptionsImgList.bgColor};">
            ${item.image.data}
          </div>  
          <div class="col-9 col-md-6 text-start">
            ${item.iframeIndex ? '<br>iframe: ' + item.iframeIndex : ''}
            ${item.iframeDepth ? '<br>depth: ' + item.iframeDepth : ''}
            ${item.image.inCSS ? '<br>in CSS' : ''}
          </div>
        </div>`;
      } else {
        cols[5].innerHTML = `
        <div class="row">
          <div class="col-3 col-md-6 img-thumbnail" style="background: ${sicOptionsImgList.bgChecker ? 'url(\'images/checker.svg\')' : sicOptionsImgList.bgColor};">
            <img src="${item.image.url}" width="${sicOptionsImgList.thumbnailWidth}">
          </div>  
          <div class="col-9 col-md-6 text-start">
            ${item.image.width}x${item.image.height}
            ${item.iframeIndex ? '<br>iframe: ' + item.iframeIndex : ''}
            ${item.iframeDepth ? '<br>depth: ' + item.iframeDepth : ''}
            ${item.image.inCSS ? '<br>in CSS' : ''}
          </div>
        </div>
        <div class="row">
          <div class="col-12 text-start">
            <a href="${item.url}" target="_blank">${displayURL}</a>
          </div>
        </div>`;
      }
    } else {
      cols[5].innerHTML = `
      <div class="row">
        <div class="col-12 text-start">
          ${item.iframeIndex ? '<br>iframe: ' + item.iframeIndex : ''}
          ${item.iframeDepth ? '<br>depth: ' + item.iframeDepth : ''}
        </div>
      </div>
      <div class="row">
        <div class="col-12 text-start">
          <a href="${item.url}" target="_blank">${displayURL}</a>
        </div>
      </div>`;
    }
  } else {
    if(item.image) {
      if(item.tag === 'SVG') {
        item.image.data = item.image.data.replace(/width\s*=\s*['"]?\d+['"]?/, `width="${sicOptionsImgList.thumbnailWidth}"`);
        item.image.data = item.image.data.replace(/height\s*=\s*['"]?\d+['"]?/, '');
        cols[5].innerHTML = `
        <div class="row">
          <div class="col-3 col-md-6 img-thumbnail" style="background: ${sicOptionsImgList.bgChecker ? 'url(\'images/checker.svg\')' : sicOptionsImgList.bgColor};">
            ${item.image.data}
          </div>  
          <div class="col-9 col-md-6 text-start">
            ${item.image.inCSS ? '<br>in CSS' : ''}
          </div>
        </div>`;
      } else {
        cols[5].innerHTML = `
        <div class="row">
          <div class="col-3 col-md-6 img-thumbnail" style="background: ${sicOptionsImgList.bgChecker ? 'url(\'images/checker.svg\')' : sicOptionsImgList.bgColor};">
            <img src="${item.image.url}" width="${sicOptionsImgList.thumbnailWidth}">
          </div>
          <div class="col-9 col-md-6 text-start">
            ${item.image.width}x${item.image.height}
            ${item.image.inCSS ? '<br>in CSS' : ''}
          </div>
        </div>
        <div class="row">
          <div class="col-12 text-start">
            <a href="${item.url}" target="_blank">${displayURL}</a>
          </div>
        </div>`;
      }
    } else {
      cols[5].innerHTML = `
        <div class="row">
          <div class="col-12 text-start">
            <a href="${item.url}" target="_blank">${displayURL}</a>
          </div>
        </div>`;
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
    tableBody.appendChild(row);
    updateRow(item);
  }
}

// Function to render table rows
function updateTable() {
  const tableBody = document.getElementById('table-body');
  if(tableBody) {
    tableBody.innerHTML = '';
    for(const item of sicItemsImgList) {
      addRow(item);
    }
  }
}

// Handle ID cell click
function idClick(item: sicItem) {
  // indeterminate select start
  if(indeterminateIndex[0] < 0) {
    indeterminateIndex[0] = item.index;
    item.check |= 2;
    updateRow(item);
    // end indeterminate select
  } if(indeterminateIndex[0] === item.index) {
    indeterminateIndex[0] = -1;
    item.check &= 1;
    updateRow(item);
  } else {
    let i = 0;
    if(indeterminateIndex[1] < 0) {
      let select = 0;
      indeterminateIndex[1] = item.index;
      for(i = 0; i < sicItemsImgList.length; i++) {
        switch(select) {
          case 0:
            if(sicItemsImgList[i].index === indeterminateIndex[0] || sicItemsImgList[i].index === indeterminateIndex[1]) {
              sicItemsImgList[i].check |= 2;
              select++;
            }
            break;
          case 1:
            if(sicItemsImgList[i].index === indeterminateIndex[0] || sicItemsImgList[i].index === indeterminateIndex[1]) {
              sicItemsImgList[i].check |= 2;
              select++;
            } else {
              sicItemsImgList[i].check |= 2;
            }
            break;
          case 2:
            break;
        }
      }
      updateTable();
    } else {
      // add indeterminate select
      if((item.check & 2) === 0) {
        item.check |= 2;
        updateRow(item);
      // cancel indeterminate select all
      } else {
        indeterminateIndex = [-1, -1];
        for(i = 0; i < sicItemsImgList.length; i++) {
          sicItemsImgList[i].check &= 1;
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
          options: convertOptionsToStorageImgList(sicOptionsImgList)
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
    const priorityOrder = [0b00, 0b01, 0b10, 0b11];
  
    const order = ascending ? 1 : -1;
  
    const checkComparison = (a & 0b01) - (b & 0b01);
    if (checkComparison !== 0) {
      return order * checkComparison;
    }
  
    const indeterminateComparison = ((a & 0b10) >> 1) - ((b & 0b10) >> 1);
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
