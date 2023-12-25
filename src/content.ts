interface sicOptionsContent {
  imgExtPattern: RegExp;
  getAToImg: boolean;
  remove1x1: boolean;
}

const sicDefOptionsContent: sicOptionsContent = {
  imgExtPattern: new RegExp(/\.(jpg|jpeg|png|svg|gif|webp|tif|tiff|bmp|ico|psd|raw)(\?.*)*$/i),
  getAToImg: false,
  remove1x1: true,
};
const sicOptionsContent = Object.assign(sicDefOptionsContent);

interface sicStorageOptionsContent {
  rxImgExtPattern: string;
  bGetAToImg: string;
  bRemove1x1: string;
}

function convertOptionsToStorageContent(options: sicOptions): sicStorageOptionsContent {
  return {
    rxImgExtPattern: options.imgExtPattern.source,
    bGetAToImg: options.getAToImg.toString(),
    bRemove1x1: options.remove1x1.toString(),
  };
}

function loadOptionsContent() {
  const storageOptions: sicStorageOptionsContent = convertOptionsToStorageContent(sicOptionsContent);
  chrome.storage.sync.get(Object.keys(storageOptions), (result) => {
    sicOptionsContent.imgExtPattern = new RegExp(result['rxImgExtPattern']);
    sicOptionsContent.getAToImg = result['bGetAToImg'] === 'true';
    sicOptionsContent.remove1x1 = result['bRemove1x1'] === 'true';

    collectItems();
  });
}

chrome.runtime.onMessage.addListener((message) => {
  switch(message.action) {
    case 'azo_sic_collectitems':
      // load options
      loadOptionsContent();
      break;
    }
});

interface sicWorkTag {
  index: number;
  tag: Element;
}

interface sicWorkItem {
  tag: sicWorkTag;
  check: number;
  type: string;
  url: string;
  iframeTag: HTMLIFrameElement | null;
  iframeIndex: number;
  iframeDepth: number;
  image: {
    url: string;
    type: string;
    mime: string;
    width: number;
    height: number;
    inCSS: boolean;
  } | null;
}
interface sicItem {
  index: number;
  tag: string;
  check: number;
  type: string;
  url: string;
  iframeIndex: number;
  iframeDepth: number;
  image: {
    url: string;
    type: string;
    mime: string;
    width: number;
    height: number;
    data: string;
    inCSS: boolean;
  } | null;
}
interface sicIframe {
  index: number;
  iframeTag: HTMLIFrameElement;
  iframeIndex: number;
  iframeDepth: number;
}

async function collectItems(): Promise<number> {
  let tagIndex: number = 0;

  const sicAllTags: sicWorkTag[] = [];
  const sicWorkItems: sicWorkItem[] = [];
  const sicItems: sicItem[] = [];

  const sicIframes: sicIframe[] = [];

  function isUniqueItem(url: string): boolean {
    for(const item of sicWorkItems) {
      if(item.url === url) {
        return false;
      }
    }
    return true;
  }

  function isUniqueSVGItem(tag: Element): boolean {
    for(const item of sicWorkItems) {
      if(item.tag.tag === tag) {
        return false;
      }
    }
    return true;
  }

  function isUniqueIframe(ifTag: HTMLIFrameElement): boolean {
    for(const sifTag of sicIframes) {
      if(sifTag.iframeTag === ifTag) {
        return false;
      }
    }
    return true;
  }

  function getFromAllTag(tag: Element): sicWorkTag | null {
    for(const atag of sicAllTags) {
      if(atag.tag === tag) {
        return atag;
      }
    }
    return null;
  }

  function processDocument(doc: Document, ifTag: HTMLIFrameElement | null, ifIdx: number, ifDpt: number): void {
    // convert to absolute URL
    function absoluteUrl(url: string): string {
      const a = doc.createElement('a');
      a.href = url;
      return a.href;
    }

    // get all tags
    const allTags = doc.querySelectorAll('*');
    for(const tag of allTags) {
      sicAllTags.push({ index: tagIndex, tag: tag });
      tagIndex++;
    }

    // 'img' tag
    for(const imgTag of doc.querySelectorAll('img')) {
      const url = absoluteUrl(imgTag.src);
      if(isUniqueItem(url)) {
        const sicImgTag = getFromAllTag(imgTag);
        const extRes = url.match(sicOptionsContent.imgExtPattern);
        if(sicImgTag) {
          sicWorkItems.push({
            tag: sicImgTag,
            check: 0,
            type: 'img',
            url: url,
            iframeTag: ifTag,
            iframeIndex: ifIdx,
            iframeDepth: ifDpt,
            image: {
              url: url,
              type: extRes && extRes.length > 1 ? extRes[1] : '',
              mime: '',
              width: 0,
              height: 0,
              inCSS: false
            }
          });
        }
      }
    }

    // 'canvas' tag
    for(const canvasTag of doc.querySelectorAll('canvas')) {
      try {
        const url = canvasTag.toDataURL();
        if(isUniqueItem(url)) {
          const sicCanvasTag = getFromAllTag(canvasTag);
          if(sicCanvasTag) {
            sicWorkItems.push({
              tag: sicCanvasTag,
              check: 0,
              type: 'canvas',
              url: url,
              iframeTag: ifTag,
              iframeIndex: ifIdx,
              iframeDepth: ifDpt,
              image: {
                url: url,
                type: '',
                mime: '',
                width: 0,
                height: 0,
                inCSS: false
              }
            });
          }
        }
      } catch(e) {
        console.warn('sic: Error occured during get from canvas.');
        const sicCanvasTag = getFromAllTag(canvasTag);
        if(sicCanvasTag) {
          sicWorkItems.push({
            tag: sicCanvasTag,
            check: 0,
            type: 'canvas',
            url: 'error',
            iframeTag: ifTag,
            iframeIndex: ifIdx,
            iframeDepth: ifDpt,
            image: null
          });
        }
      }
    }

    // backgroung image
    for(const tag of doc.querySelectorAll('*')) {
      const url = window.getComputedStyle(tag).backgroundImage.replace(/url\(['"]?(.*?)['"]?\)/i, "$1");
      if(url !== 'none' && url !== '') {
        if(isUniqueItem(absoluteUrl(url))) {
          const sicTag = getFromAllTag(tag);
          const extRes = url.match(sicOptionsContent.imgExtPattern);
          if(sicTag) {
            sicWorkItems.push({
              tag: sicTag,
              check: 0,
              type: 'bgimg',
              url: url,
              iframeTag: ifTag,
              iframeIndex: ifIdx,
              iframeDepth: ifDpt,
              image: {
                url: url,
                type: extRes && extRes.length > 1 ? extRes[1] : '',
                mime: '',
                width: 0,
                height: 0,
                inCSS: true
              }
            });
          }
        }
      }
    }

    // 'svg' tag
    for(const svgTag of doc.querySelectorAll('svg')) {
      if(isUniqueSVGItem(svgTag)) {
        const sicSvgTag = getFromAllTag(svgTag);
        if(sicSvgTag) {
          sicWorkItems.push({
            tag: sicSvgTag,
            check: 0,
            type: 'svg',
            url: '',
            iframeTag: ifTag,
            iframeIndex: ifIdx,
            iframeDepth: ifDpt,
            image: {
              url: '',
              type: 'svg',
              mime: '',
              width: 0,
              height: 0,
              inCSS: false
            }
        });
        }
      }
    }

    // 'a' tag to image
    for(const aTag of doc.querySelectorAll('a')) {
      const url = absoluteUrl(aTag.href);
      if(isUniqueItem(url)) {
        const sicATag = getFromAllTag(aTag);
        const extRes = aTag.href.match(sicOptionsContent.imgExtPattern);
        if(sicATag && extRes && extRes.length > 1) {
          if(sicOptionsContent.getAToImg) {
            sicWorkItems.push({
              tag: sicATag,
              check: 0,
              type: 'atoimg',
              url: url,
              iframeTag: ifTag,
              iframeIndex: ifIdx,
              iframeDepth: ifDpt,
              image: {
                url: url,
                type: extRes && extRes.length > 1 ? extRes[1] : '',
                mime: '',
                width: 0,
                height: 0,
                inCSS: false
              }
            });
          } else {
            sicWorkItems.push({
              tag: sicATag,
              check: 0,
              type: 'atoimg',
              url: url,
              iframeTag: ifTag,
              iframeIndex: ifIdx,
              iframeDepth: ifDpt,
              image: null
            });
          }
        }
      }
    }

    // 'a' tag includes 'img' tag
    for(const aTag of doc.querySelectorAll('a')) {
      const imgs = aTag.querySelectorAll('img');
      if(imgs.length) {
        const url = absoluteUrl(aTag.href);
        if(isUniqueItem(url)) {
          const sicATag = getFromAllTag(aTag);
          if(sicATag) {
            sicWorkItems.push({
              tag: sicATag,
              check: 0,
              type: 'a+img',
              url: url,
              iframeTag: ifTag,
              iframeIndex: ifIdx,
              iframeDepth: ifDpt,
              image: null
            });
          }
        }
      }
    }

    // iframe tag (recursive)
    for(const iframeTag of doc.querySelectorAll('iframe')) {
      if(isUniqueIframe(iframeTag)) {
        if(iframeTag.contentDocument) {
          sicIframes.push({
            index: ifIdx,
            iframeTag: iframeTag,
            iframeIndex: ifIdx,
            iframeDepth: ifDpt
          });
          ifIdx++;
          processDocument(iframeTag.contentDocument, iframeTag, ifIdx, ifDpt + 1)
        }
      }
    }
  }

  // Start traversing the DOM from the top-level document
  processDocument(document, null, 0, 0);

  function workToItem(wi: sicWorkItem): sicItem {
    const item: sicItem = {
      index: wi.tag.index,
      tag: wi.tag.tag.tagName.toUpperCase(),
      check: wi.check,
      type: wi.type,
      url: wi.url,
      iframeIndex: wi.iframeIndex,
      iframeDepth: wi.iframeDepth,
      image: null
    };
    if(wi.image) {
      item.image = {
        url: wi.image.url,
        type: wi.image.type,
        mime: wi.image.mime,
        width: wi.image.width,
        height: wi.image.height,
        data: '',
        inCSS: wi.image.inCSS
      };
      if(/svg/i.test(item.tag)) {
        item.image.data = wi.tag.tag.outerHTML;
      }
    }

    return item;
  }

  for(const item of sicWorkItems) {
    sicItems.push(workToItem(item));
  }

  await chrome.runtime.sendMessage({
    action: 'azo_sic_itemscollected',
    title: document.title,
    url: document.URL,
    sicitems: sicItems
  });

  return 1;
}
