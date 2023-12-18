import { TargetContext } from './index';

type ThemeType = 'light' | 'dark'

const theme: ThemeType = 'dark'

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

export const genOnLoad = (init: (context: TargetContext) => void) => () => {
  var image = document.createElement('div');

  console.log('====>Enter genOnLoad')

  const iframeContainer = document.createElement('div');

  setStyleProperties.bind(image.style)({
    position: 'fixed',
    cursor: 'pointer',
    'z-index': 100,
    ...imageSize,
    ...imagePosition,
  });

  let isTrollboxShow = true;

  image.classList.add(theme);

  image.classList.add('animate__fadeOut');

  image.classList.add('image');

  image.addEventListener('click', () => {
    image.classList.remove('image_in', 'image_out')
    isTrollboxShow = !isTrollboxShow;
    image.classList.add(isTrollboxShow ? 'image_in' : 'image_out');
    iframeContainer.style.visibility = isTrollboxShow ? 'visible' : 'hidden';
  });

  image.addEventListener('mouseenter', () => {
    image.classList.remove('animate__fadeOut')
  });

  image.addEventListener('mouseleave', () => {
    image.classList.add('animate__fadeOut')
  });

  setStyleProperties.bind(iframeContainer.style)({
    position: 'fixed',
    background: '#fff',
    'z-index': 100,
    'border-radius': '16px',
    ...trollboxSize,
    ...trollboxPosition,
  });

  const iframe = document.createElement('iframe');
  iframe.id = 'trollbox';

  iframe.onload = function () {
    init({
      targetWindow: iframe.contentWindow!,
      targetOrigin: new URL(iframe.src).origin,
    });
  };

  iframe.src = 'https://test.trollbox.iotacat.com';

  setStyleProperties.bind(iframe.style)({
    width: '100%',
    height: '100%',
    border: 'rgba(0,0,0,0.1)',
    'box-shadow': '0 6px 6px -1px rgba(0,0,0,0.1)',
    'border-radius': 16,
  });

  iframeContainer.append(iframe);

  document.body.append(image);
  document.body.append(iframeContainer);
};
