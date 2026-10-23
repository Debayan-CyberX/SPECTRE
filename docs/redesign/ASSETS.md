# Cinematic asset provenance

The live evidence stack, source documents, point terrain, projected source tiles, relationships, waveform and record details are code-rendered. The supplied reference images are art direction; no screenshot is used as the webpage background or passed off as working UI.

## Portal artwork

Final application asset: [`frontend/public/experience/portal.webp`](../../frontend/public/experience/portal.webp), 1024 × 1536, approximately 163 KiB. Generated with the **built-in image_gen tool**, then encoded to WebP for the website. The original generated PNG remains in the local image-generation output directory. The webpage layers the artwork with autonomous camera motion, moving light and an animated procedural field; pause and reduced-motion controls apply.

Final generation prompt:

> Create a premium cinematic digital matte painting asset for the right half of a black forensic intelligence website. NO TEXT, NO LETTERS, NO UI, NO logos, no typography. Vertical composition 2:3. Extremely dark obsidian monumental brutalist canyon/doorway, immense narrow vertical slit of cold ivory daylight at upper center-right, a single tiny human investigator silhouette standing on wet reflective black stone at the foot of the opening, thin atmospheric volumetric mist, micro-textured slate and graphite rock walls, distant particle-like fine rain and silver dust, restrained warm silver reflections, photorealistic film still, monochrome near-black palette #070B09 #1A2221 #A6A9AA #EDEAE4, no cyan, no blue, no saturated colors. Similar mood to a vast dark forensic data cathedral. Left 30 percent dissolves naturally into pure near-black empty space for compositing. Deep shadows, high material detail, subtle grain, elegant architectural photography, not a glowing sci-fi tunnel. The asset will be layered with code-driven light, fog and parallax; leave clean composition without any interface elements.

This is illustrative narrative artwork. It is not an evidence artifact or a photograph from an investigation.

## Fonts and rendering

The latest typography reference uses self-hosted Geist bold paired with Instrument Serif italic on the public page and dashboard case heading; Sora remains the spaced wordmark. Workspace metadata retains Geist/Geist Mono. Shared silver shafts, haze and glints are procedural CSS layers. Three.js 0.186.1 renders the evidence planes, instanced fragments, source tiles, explicit process-link pulses and floating source documents. It is loaded only as a scene approaches the viewport. Canvas 2D provides the terrain and a usable fallback when WebGL is unavailable. No external font service, image service, AI API key or mandatory cloud component is required at runtime.
