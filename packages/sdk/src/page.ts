import { TargetContext } from './index';
import { LoadTrollboxParams } from './types';

type ThemeType = 'light' | 'dark';

const theme: ThemeType = 'dark';

const imagePosition = {
  right: 10,
  bottom: 10,
};

const imageSize = {
  width: 53,
  height: 53,
};

const trollboxSize = {
  width: 375,
  height: 640,
};

const trollboxPosition = {
  right: 10,
  bottom: 10,
};

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
    'box-shadow': '0 6px 6px -1px rgba(0,0,0,0.1)',
    'border-radius': '16px',
  });

  return iframe;
}

function generateIframeSrc(params?: LoadTrollboxParams) {
  const walletType = params?.walletType
  const searchParams = new URLSearchParams()

  searchParams.append('timestamp', Date.now().toString())

  if (walletType) {
    searchParams.append('walletType', walletType)
  }
  
  return `https://test.trollbox.groupfi.ai?timestamp=${searchParams.toString()}`
}

function generateIframeContainerDOM(isTrollboxShow: boolean) {
  const iframeContainer = document.createElement('div');
  iframeContainer.id = 'groupfi_box';

  setStyleProperties.bind(iframeContainer.style)({
    position: 'fixed',
    background: '#fff',
    'z-index': 100,
    visibility: isTrollboxShow ? 'visible' : 'hidden',
    'border-radius': '16px',
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
