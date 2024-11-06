import henderea from 'eslint-config-henderea';

export default [
  ...henderea,
  {
    ignores: ['dist', 'assets']
  }
];
