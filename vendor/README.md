# Experiment vendor artifacts

This directory holds a packed build of the companion
[`protocoltooling`](https://github.com/robertonevarez/protocoltooling)
experiment branch so GitHub Actions and Vercel can install
`@protocoltooling/fullcalendar` without a sibling `file:../…` path.

Regenerate after core experiment changes:

```bash
npm run pack:experiment-dep
npm install
```

Do not treat this tarball as a published release of `@protocoltooling/fullcalendar@0.1.1`.
