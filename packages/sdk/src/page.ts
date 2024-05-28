import { TargetContext } from './index';
import {LoadTrollboxParams, ThemeType} from './types';

declare var window: Window;

let theme: ThemeType = 'dark';

const imagePosition = {
  right: 10,
  bottom: 10,
};

const imageSize = {
  width: 53,
  height: 53,
};

const trollboxSize = {
  width: 385,
  height: 640,
};

const maxTrollboxSize = {
  width: 480,
  height: window.innerHeight - 28
};

const minTrollboxSize = {
  width: 320,
  height: 240
};

const trollboxPosition = {
  right: 5,
  bottom: 5,
};

const BORDER_SIZE = 4;

function setStyleProperties(
  this: CSSStyleDeclaration,
  properties: {
    [property: string]: string | number;
  }
) {
  for (const key in properties) {
    let value = properties[key];
    if (typeof value === 'number') {
      value = value + 'px';
    }
    this.setProperty(key, value);
  }
}

interface TrollboxPreference {
  isOpen: boolean;
}

const trollboxPreferenceStorageKey = 'trollbox.preference';

function getTrollboxPreference(): TrollboxPreference | undefined {
  const preferences = localStorage.getItem(trollboxPreferenceStorageKey);
  if (preferences !== null) {
    return JSON.parse(preferences);
  }
  return undefined;
}

function storeTrollboxPreference(preference: TrollboxPreference) {
  localStorage.setItem(
    trollboxPreferenceStorageKey,
    JSON.stringify(preference)
  );
}

export const genOnLoad = (init: (context: TargetContext) => void, params?: LoadTrollboxParams) => () => {
  console.log('start load iframe');

  let iframeContainer = document.getElementById(
    'groupfi_box'
  ) as HTMLDivElement | null;
  let btn = document.getElementById('groupfi_btn') as HTMLDivElement | null;
  let iframe = document.getElementById('trollbox') as HTMLIFrameElement | null;

  if (iframeContainer !== null && btn !== null && iframe !== null) {
    console.log('Reuse GroupFi DOM')
    iframeContainer.style.display = 'block';
    btn.style.display = 'block';

    iframe.src = generateIframeSrc(params)

    iframe.onload = function () {
      console.log('iframe loaded');
      init({
        targetWindow: iframe!.contentWindow!,
        targetOrigin: new URL(iframe!.src).origin,
      });
    };

    return;
  }

  console.log('Generate GroupFi DOM')

  const trollboxPreference = getTrollboxPreference();
  let isTrollboxShow = !!trollboxPreference?.isOpen;

  // generate iframe container dom
  iframeContainer = generateIframeContainerDOM(isTrollboxShow);
  // generate groupfi btn dom
  btn = generateBtnDOM(iframeContainer, isTrollboxShow);

  // generate iframe dom
  iframe = generateIframeDOM(init, params);

  iframeContainer.append(iframe);
  document.body.append(btn);
  document.body.append(iframeContainer);
};

function generateIframeDOM(init: (context: TargetContext) => void, params?: LoadTrollboxParams) {
  const iframe = document.createElement('iframe');
  iframe.id = 'trollbox';
  iframe.allow = 'clipboard-read; clipboard-write';

  iframe.src = generateIframeSrc(params)

  iframe.onload = function () {
    console.log('iframe loaded');
    init({
      targetWindow: iframe.contentWindow!,
      targetOrigin: new URL(iframe.src).origin,
    });
  };

  setStyleProperties.bind(iframe.style)({
    width: '100%',
    height: '100%',
    border: 'rgba(0,0,0,0.1)',
    background: theme === 'light' ? '#fff' : '#212122',
    'box-shadow': '0 6px 6px -1px rgba(0,0,0,0.1)',
    'border-radius': '16px',
  });

  return iframe;
}

function generateIframeSrc(params?: LoadTrollboxParams) {
  const walletType = params?.walletType
  const searchParams = new URLSearchParams()
  theme = params?.theme || 'light'

  searchParams.append('timestamp', Date.now().toString())
  searchParams.append('theme', theme)

  if (walletType) {
    searchParams.append('walletType', walletType)
  }

  return `https://test.trollbox.groupfi.ai/?${searchParams.toString()}`
}

function generateIframeContainerDOM(isTrollboxShow: boolean) {
  let activeX = false, activeY = false, lastX = 0, lastY = 0;
  const iframeContainer = document.createElement('div');
  const moveHandler = (event: MouseEvent) => {
    // console.log('move', event);
    if (activeX) {
      const dx = lastX - event.x;
      lastX = event.x;
      const width = parseInt(iframeContainer.style.width) + dx;
      const finalWidth = Math.max(minTrollboxSize.width, Math.min(maxTrollboxSize.width, width));
      iframeContainer.style.width = `${finalWidth}px`;
    }
    if (activeY) {
      const dy = lastY - event.y;
      lastY = event.y;
      const height = parseInt(iframeContainer.style.height) + dy;
      const finalHeight = Math.max(minTrollboxSize.height, Math.min(maxTrollboxSize.height, height));
      iframeContainer.style.height = `${finalHeight}px`;
    }
  };
  iframeContainer.id = 'groupfi_box';
  iframeContainer.addEventListener('mousedown', (e) => {
    if (e.offsetX < BORDER_SIZE) {
      lastX = e.x;
      activeX = true;
    }
    if (e.offsetY < BORDER_SIZE) {
      lastY = e.y;
      activeY = true;
    }
    if (e.offsetX < BORDER_SIZE || e.offsetY < BORDER_SIZE) {
      iframeContainer.style.background = '#f7f7f77f';
      const iframe = document.querySelector('iframe#trollbox') as HTMLIFrameElement | null;
      iframe && (iframe.style.display = 'none');
      document.addEventListener('mousemove', moveHandler);
    }
  });
  document.addEventListener('mouseup', () => {
    if (activeX) {
      lastX = 0;
      activeX = false;
    }
    if (activeY) {
      lastY = 0;
      activeY = false;
    }
    iframeContainer.style.background = 'transparent';
    const iframe = document.querySelector('iframe#trollbox') as HTMLIFrameElement | null;
    iframe && (iframe.style.display = 'block');
    document.removeEventListener('mousemove', moveHandler);
  });

  const vhandler = document.createElement('div');
  setStyleProperties.bind(vhandler.style)({
    position: 'absolute',
    left: '0',
    top: '4px',
    width: '4px',
    height: '100%',
    display: 'flex',
    'align-items': 'center'
  });
  vhandler.addEventListener('mouseenter', () => {
    vhandlerbar.style.backgroundColor = 'rgba(0,0,0,0.25)';
    iframeContainer.style.cursor = 'ew-resize';
  });
  vhandler.addEventListener('mouseleave', () => {
    vhandlerbar.style.backgroundColor = 'rgba(0,0,0,0.01)';
    iframeContainer.style.cursor = 'default';
  });
  const vhandlerbar = document.createElement('div');
  vhandler.append(vhandlerbar);
  setStyleProperties.bind(vhandlerbar.style)({
    width: '4px',
    height: '50px',
    'border-radius': '2px',
    'margin-left': '-2px',
    background: 'rgba(0,0,0,0.01)'
  });
  const hhandler = document.createElement('div');
  setStyleProperties.bind(hhandler.style)({
    position: 'absolute',
    left: '4px',
    top: '0',
    width: '100%',
    height: '4px',
    display: 'flex',
    'justify-content': 'center'
  });
  hhandler.addEventListener('mouseenter', () => {
    hhandlerbar.style.backgroundColor = 'rgba(0,0,0,0.25)';
    iframeContainer.style.cursor = 'ns-resize';
  });
  hhandler.addEventListener('mouseleave', () => {
    hhandlerbar.style.backgroundColor = 'rgba(0,0,0,0.01)';
    iframeContainer.style.cursor = 'default';
  });
  const hhandlerbar = document.createElement('div');
  hhandler.append(hhandlerbar);
  setStyleProperties.bind(hhandlerbar.style)({
    width: '50px',
    height: '4px',
    'border-radius': '2px',
    'margin-top': '-2px',
    background: 'rgba(0,0,0,0.01)'
  });
  iframeContainer.append(vhandler);
  iframeContainer.append(hhandler);

  setStyleProperties.bind(iframeContainer.style)({
    position: 'fixed',
    // background: '#fff',
    'z-index': 100,
    visibility: isTrollboxShow ? 'visible' : 'hidden',
    'border-radius': '16px',
    'padding': `${BORDER_SIZE}px`,
    // cursor: 'pointer',
    ...trollboxSize,
    ...trollboxPosition,
  });
  return iframeContainer;
}

function generateBtnDOM(
  iframeContainer: HTMLDivElement,
  isTrollboxShow: boolean
) {
  const btn = document.createElement('div');
  btn.id = 'groupfi_btn';

  setStyleProperties.bind(btn.style)({
    position: 'fixed',
    cursor: 'pointer',
    'z-index': 100,
    ...imageSize,
    ...imagePosition,
  });

  btn.classList.add(theme);

  btn.classList.add('animate__fadeOut');

  btn.classList.add('image');

  btn.addEventListener('mouseenter', () => {
    btn.classList.remove('animate__fadeOut');
  });

  btn.addEventListener('mouseleave', () => {
    btn.classList.add('animate__fadeOut');
  });

  const toggleTrollbox = () => {
    btn.classList.remove('image_in', 'image_out');
    isTrollboxShow = !isTrollboxShow;
    btn.classList.add(isTrollboxShow ? 'image_in' : 'image_out');
    iframeContainer.style.visibility = isTrollboxShow ? 'visible' : 'hidden';
    btn.style.visibility = isTrollboxShow ? 'hidden' : 'visible';
    storeTrollboxPreference({ isOpen: isTrollboxShow });
  };

  btn.addEventListener('click', () => {
    toggleTrollbox();
  });

  window.addEventListener('message', (event) => {
    if (event.data === 'collapse-trollbox') {
      toggleTrollbox();
    }
  });

  return btn;
}
