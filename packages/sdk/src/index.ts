import svg from './trollbox.svg';

const imagePosition = {
  right: 60,
  bottom: 0,
};

const imageSize = {
  width: 60,
  height: 60,
};

const trollboxSize = {
  width: 375,
  height: 600,
};

const trollboxPosition = {
  right: imagePosition.right,
  bottom: imagePosition.bottom + imageSize.height + 10,
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

const onLoad = () => {
  var image = document.createElement('img');

  const iframeContainer = document.createElement('div');

  image.src = svg;

  setStyleProperties.bind(image.style)({
    position: 'fixed',
    cursor: 'pointer',
    ...imageSize,
    ...imagePosition,
  });

  let isTrollboxShow = true;

  image.addEventListener('click', () => {
    isTrollboxShow = !isTrollboxShow;
    iframeContainer.style.display = isTrollboxShow ? 'block' : 'none';
  });

  setStyleProperties.bind(iframeContainer.style)({
    position: 'fixed',
    background: '#fff',
    ...trollboxSize,
    ...trollboxPosition,
  });


  const iframe = document.createElement('iframe');

  iframe.src = 'https://test.trollbox.iotacat.com/';

  setStyleProperties.bind(iframe.style)({
    width: '100%',
    height: '100%',
    border: 'rgba(0,0,0,0.1)',
    'box-shadow': '0 6px 6px -1px rgba(0,0,0,0.1)',
    'border-radius': 16
  })

  iframeContainer.append(iframe)

  document.body.append(image);
  document.body.append(iframeContainer);
};

window.addEventListener('load', onLoad);
