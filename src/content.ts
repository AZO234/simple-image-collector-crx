interface sicOptionsContent {
  imgExtPattern: RegExp;
  getAToImg: boolean;
  remove1x1: boolean;
  rTimeout: number;
}

const sicDefOptionsContent: sicOptionsContent = {
  imgExtPattern: new RegExp(/\.(jpg|jpeg|png|svg|gif|webp|heic|heif|avif|tif|tiff|bmp|ico|psd|raw)(\?.*)*$/i),
  getAToImg: false,
  remove1x1: true,
  rTimeout: 10000
};
const sicOptionsContent = Object.assign(sicDefOptionsContent);

interface sicStorageOptionsContent {
  rxImgExtPattern: string;
  bGetAToImg: string;
  bRemove1x1: string;
  nmbRTimeout: string;
}

function convertOptionsToStorageContent(options: sicOptions): sicStorageOptionsContent {
  return {
    rxImgExtPattern: options.imgExtPattern.source,
    bGetAToImg: options.getAToImg.toString(),
    bRemove1x1: options.remove1x1.toString(),
    nmbRTimeout: options.rTimeout.toString()
  };
}

function loadOptionsContent() {
  const storageOptions: sicStorageOptionsContent = convertOptionsToStorageContent(sicOptionsContent);
  chrome.storage.sync.get(Object.keys(storageOptions), (result) => {
    sicOptionsContent.imgExtPattern = new RegExp(result['rxImgExtPattern']);
    sicOptionsContent.getAToImg = result['bGetAToImg'] === 'true';
    sicOptionsContent.remove1x1 = result['bRemove1x1'] === 'true';
    sicOptionsContent.rTimeout = Number(result['nmbRTimeout']);

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

    // wait for DOM loaded
    let waitFlag = true;
    let waitTime = 0;
    doc.addEventListener('DOMContentLoaded', function() {
      waitFlag = false;
    });
    while(waitFlag && waitTime < sicOptionsContent.rTimeout) {
      setTimeout(() => {}, 100);
      waitTime += 100;
    }

    // get all tags
    const allTags = doc.querySelectorAll('*');
    for(const tag of allTags) {
      sicAllTags.push({ index: tagIndex, tag: tag });
      tagIndex++;
    }

    // 'link' tag
    for(const tag of doc.querySelectorAll('link')) {
      const linkTag = <HTMLLinkElement>tag;
      if(/(icon|image|preload)$/i.test(linkTag.rel)) {
        if(/preload/i.test(linkTag.rel) && !/image/i.test(linkTag.as)) {
          continue;
        }
        const url = absoluteUrl(linkTag.href);
        if(isUniqueItem(url)) {
          const sicLinkTag = getFromAllTag(linkTag);
          const extRes = (url.match(sicOptionsContent.imgExtPattern) || [])[1] || '';
          if(sicLinkTag) {
            sicWorkItems.push({
              tag: sicLinkTag,
              check: 0,
              type: 'link',
              url: url,
              iframeTag: ifTag,
              iframeIndex: ifIdx,
              iframeDepth: ifDpt,
              image: {
                url: url,
                type: extRes,
                mime: '',
                width: 0,
                height: 0,
                inCSS: false
              }
            });
          }
        }
      }
    }

    // 'meta' tag
    for(const tag of doc.querySelectorAll('meta')) {
      const metaTag = <HTMLMetaElement>tag;
      if(/(icon|image)$/i.test(metaTag.name)) {
        const url = absoluteUrl(metaTag.content);
        if(isUniqueItem(url)) {
          const sicMetaTag = getFromAllTag(metaTag);
          const extRes = (url.match(sicOptionsContent.imgExtPattern) || [])[1] || '';
          if(sicMetaTag) {
            sicWorkItems.push({
              tag: sicMetaTag,
              check: 0,
              type: 'meta',
              url: url,
              iframeTag: ifTag,
              iframeIndex: ifIdx,
              iframeDepth: ifDpt,
              image: {
                url: url,
                type: extRes,
                mime: '',
                width: 0,
                height: 0,
                inCSS: false
              }
            });
          }
        }
      }
    }

    // 'img' tag
    for(const tag of doc.querySelectorAll('img')) {
      const imgTag = <HTMLImageElement>tag;
      const url = absoluteUrl(imgTag.src);
      if(isUniqueItem(url)) {
        const sicImgTag = getFromAllTag(imgTag);
        const extRes = (url.match(sicOptionsContent.imgExtPattern) || [])[1] || '';
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
              type: extRes,
              mime: '',
              width: 0,
              height: 0,
              inCSS: false
            }
          });
        }
      }
    }

    // 'picture' & 'source' tag
    for(const taga of doc.querySelectorAll('picture')) {
      const pictureTag = <HTMLPictureElement>taga;
      for(const tagb of pictureTag.querySelectorAll('source')) {
        const sourceTag = <HTMLSourceElement>tagb;
        const url = absoluteUrl(sourceTag.srcset);
        if(isUniqueItem(url)) {
          const sicSourceTag = getFromAllTag(sourceTag);
          const extRes = (url.match(sicOptionsContent.imgExtPattern) || [])[1] || '';
          if(sicSourceTag) {
            sicWorkItems.push({
              tag: sicSourceTag,
              check: 0,
              type: 'source',
              url: url,
              iframeTag: ifTag,
              iframeIndex: ifIdx,
              iframeDepth: ifDpt,
              image: {
                url: url,
                type: extRes,
                mime: '',
                width: 0,
                height: 0,
                inCSS: false
              }
            });
          }
        }
      }
    }

    // 'canvas' tag
    for(const tag of doc.querySelectorAll('canvas')) {
      const canvasTag = <HTMLCanvasElement>tag;
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
      const style = window.getComputedStyle(tag); 
      const url = (style.background.match(/url\(['"](.*?)['"]\)/i) || [])[1] || '';
      if(url !== '' && url !== 'none') {
        if(isUniqueItem(absoluteUrl(url))) {
          const sicTag = getFromAllTag(tag);
          const extRes = (url.match(sicOptionsContent.imgExtPattern) || [])[1] || '';
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
                type: extRes,
                mime: '',
                width: 0,
                height: 0,
                inCSS: true
              }
            });
          }
        }
      }
      const urla = (style.backgroundImage.match(/url\(['"](.*?)['"]\)/i) || [])[1] || '';
      if(urla && urla !== '' && urla !== 'none') {
        if(isUniqueItem(absoluteUrl(urla))) {
          const sicTag = getFromAllTag(tag);
          const extRes = (urla.match(sicOptionsContent.imgExtPattern) || [])[1] || '';
          if(sicTag) {
            sicWorkItems.push({
              tag: sicTag,
              check: 0,
              type: 'bgimg',
              url: urla,
              iframeTag: ifTag,
              iframeIndex: ifIdx,
              iframeDepth: ifDpt,
              image: {
                url: urla,
                type: extRes,
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
    for(const tag of doc.querySelectorAll('svg')) {
      const svgTag = <SVGSVGElement>tag;
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
    for(const tag of doc.querySelectorAll('a')) {
      const aTag = <HTMLAnchorElement>tag;
      const url = absoluteUrl(aTag.href);
      if(isUniqueItem(url)) {
        const sicATag = getFromAllTag(aTag);
        const extRes = (aTag.href.match(sicOptionsContent.imgExtPattern) || [])[1] || '';
        if(sicATag && extRes !== '') {
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
                type: extRes,
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

    // 'map' tag
    for(const tag of doc.querySelectorAll('map')) {
      const mapTag = <HTMLMapElement>tag;
      for(const atag of mapTag.querySelectorAll('area')) {
        const areaTag = <HTMLAreaElement>atag;
        const url = absoluteUrl(areaTag.href);
        if(isUniqueItem(url)) {
          const sicAreaTag = getFromAllTag(areaTag);
          const extRes = (areaTag.href.match(sicOptionsContent.imgExtPattern) || [])[1] || '';
          if(sicAreaTag && extRes !== '') {
            if(sicOptionsContent.getAToImg) {
              sicWorkItems.push({
                tag: sicAreaTag,
                check: 0,
                type: 'areatoimg',
                url: url,
                iframeTag: ifTag,
                iframeIndex: ifIdx,
                iframeDepth: ifDpt,
                image: {
                  url: url,
                  type: extRes,
                  mime: '',
                  width: 0,
                  height: 0,
                  inCSS: false
                }
              });
            } else {
              sicWorkItems.push({
                tag: sicAreaTag,
                check: 0,
                type: 'areatoimg',
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
    }

    // 'a' tag includes 'img' tag
    for(const tag of doc.querySelectorAll('a')) {
      const aTag = <HTMLAnchorElement>tag;
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
    for(const tag of doc.querySelectorAll('iframe')) {
      const iframeTag = <HTMLIFrameElement>tag;
      if(iframeTag.contentDocument) {
        if(isUniqueIframe(iframeTag)) {
          sicIframes.push({
            index: ifIdx,
            iframeTag: iframeTag,
            iframeIndex: ifIdx,
            iframeDepth: ifDpt
          });
          ifIdx++;
          if(ifDpt < 10) {
            processDocument(iframeTag.contentDocument, iframeTag, ifIdx, ifDpt + 1);
          }
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
