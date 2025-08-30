import {
  expect,
  getChildAtIndex,
  forEachChildren,
} from '../utils.js';

import {
  createTimer,
  createDraggable,
  utils,
} from '../../src/anime.js';

const createMouseEvent = ($target, name, x, y) => $target.dispatchEvent(new MouseEvent('mouse' + name, {
  clientX: x,
  clientY: y,
  bubbles: true,
  cancelable: true
}));

suite('Draggables', () => {
  test('Triggering a reset in the onSettle callback should correctly set the values', resolve => {
    const draggable = createDraggable('#target-id', {
      container: '#css-tests',
      onSettle: self => {
        self.reset();
        expect(utils.get('#target-id', 'x', false)).to.equal(0);
        expect(utils.get('#target-id', 'y', false)).to.equal(0);
        resolve();
      }
    });
    draggable.animate.translateX(100, 10);
    draggable.animate.translateY(100, 10);
  });

  test('Reverting a draggable should properly disconect the ResizeObserver attached to it', resolve => {
    const [ $container ] = utils.$('#css-tests');
    let resizes = 0;
    const draggable = createDraggable('#target-id', {
      container: $container,
      onResize: () => {
        resizes++;
      }
    });
    draggable.revert();
    setTimeout(() => {
      $container.style.width = '100px';
    }, 1)
    setTimeout(() => {
      expect(resizes).to.equal(0);
      resolve();
    }, 200)
  });

  test('Removing the parent should not throw an error', resolve => {
    const draggable = createDraggable('#target-id', { container: '#css-tests' });
    setTimeout(() => {
      document.querySelector('#css-tests').remove();
    }, 0);
    setTimeout(() => {
      resolve();
      draggable.revert();
    }, 200);
  });

  test('onUpdate should only trigger when the dragged element actually moves', resolve => {
    const [ $target ] = utils.$('#target-id');
    const [ $container ] = utils.$('#css-tests');
    let updates = 0;
    let grabbed = 0;
    let dragged = 0;
    let released = 0;

    const draggable = createDraggable($target, {
      container: $container,
      onUpdate: () => {
        updates++;
      },
      onGrab: () => grabbed++,
      onDrag: () => dragged++,
      onRelease: () => released++
    });

    expect(updates).to.equal(0);

    createMouseEvent($target, 'down', 0, 0);

    createTimer({
      onBegin: () => createMouseEvent(document, 'move', 10, 10),
      onUpdate: () => createMouseEvent(document, 'move', 10, 10),
      onComplete: () => {
        createMouseEvent(document, 'move', 10, 10);
        createMouseEvent(document, 'up', 10, 10);
        expect(grabbed).to.equal(1);
        expect(released).to.equal(1);
        expect(updates).to.equal(2);
        resolve();
        draggable.revert();
      },
      duration: 33,
    });
  });

  test('onUpdate should properly trigger when the dragged element only moves horizontally', resolve => {
    const [ $target ] = utils.$('#target-id');
    const [ $container ] = utils.$('#css-tests');
    let updates = 0;
    let x = 0;
    let y = 0;

    const draggable = createDraggable($target, {
      container: $container,
      releaseDamping: 2000,
      releaseStiffness: 2000,
      onUpdate: () => {
        updates++;
      },
      onSettle: () => {
        expect(updates).to.be.above(1);
        resolve();
        draggable.revert();
      }
    });

    expect(updates).to.equal(0);

    createMouseEvent($target, 'down', x, y);

    createTimer({
      onBegin: () => createMouseEvent(document, 'move', ++x, 0),
      onUpdate: () => createMouseEvent(document, 'move', ++x, 0),
      onComplete: () => {
        createMouseEvent(document, 'move', ++x, 0);
        createMouseEvent(document, 'up', ++x, 0);
      },
      duration: 33,
    });
  });

});
