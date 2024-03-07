import { TargetContext } from './index';

type ThemeType = 'light' | 'dark';

const theme: ThemeType = 'dark';

const imagePosition = {
  right: 20,
  bottom: 10,
};

const imageSize = {
  width: 53,
  height: 53,
};

const trollboxSize = {
  width: 375,
  height: 600,
};

const trollboxPosition = {
  right: imagePosition.right,
  bottom: imagePosition.bottom + imageSize.height + 5,
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

export const genOnLoad = (init: (context: TargetContext) => void) => () => {
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

    iframe.src = `https://test.trollbox.groupfi.ai?timestamp=${Date.now()}`;

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
  iframe = generateIframeDOM(init);

  iframeContainer.append(iframe);
  document.body.append(btn);
  document.body.append(iframeContainer);
};

function generateIframeDOM(init: (context: TargetContext) => void) {
  const iframe = document.createElement('iframe');
  iframe.id = 'trollbox';
  iframe.allow = 'clipboard-read; clipboard-write';

  iframe.src = `https://test.trollbox.groupfi.ai?timestamp=${Date.now()}`;

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
    'border-radius': 16,
  });

  return iframe;
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

  btn.addEventListener('click', () => {
    btn.classList.remove('image_in', 'image_out');
    isTrollboxShow = !isTrollboxShow;
    btn.classList.add(isTrollboxShow ? 'image_in' : 'image_out');
    iframeContainer.style.visibility = isTrollboxShow ? 'visible' : 'hidden';
    storeTrollboxPreference({ isOpen: isTrollboxShow });
  });

  return btn;
}