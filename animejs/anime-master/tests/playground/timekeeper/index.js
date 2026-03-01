import {
  utils,
  createScope,
  createTimeline,
  stagger
} from '../../../lib/anime.esm.js';

const timekeeper = utils.keepTime(scope => {
  const isMinM = scope.matches.minM;
  return createTimeline().add('.square', {
    y: 200,
    rotate: -90,
    scale: utils.random(.8, .9, 2),
    background: isMinM ? '#0FF' : '#FF0',
    alternate: true,
    loop: true,
    ease: 'inOutQuad',
  }, stagger(200));
});

createScope({
  mediaQueries: { minM: '(min-width: 800px)' }
}).add(self => {
  self.preserve(timekeeper);
});
