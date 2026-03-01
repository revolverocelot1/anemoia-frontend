import {
  animate,
  createTimeline,
  utils,
} from '../../../lib/anime.esm.js';

utils.set('.square', {
  y: 0,
  rotate: 45,
})

animate('.square', {
  y: '+=50',
  rotate: () => '+=10',
  loop: true,
  onLoop: self => self.refresh()
});
