# Style A generation prompts

Generated with the built-in image generation tool using the supplied tiger and elephant as style references.

Shared constraints for all assets: thick uniform dark-navy outline where appropriate, rounded friendly geometry, simple large shapes, very limited palette, flat solid colors, no gradients, no shading, no highlights, no shadows, no texture, no 3D, no text, no watermark, and a perfectly uniform chroma-key background with no cast/contact shadow.

Animals: one original, centered, front-facing head-and-short-neck portrait; simple round navy eyes; the species must remain identifiable from the silhouette alone at 41 px. Distinctive prompts used: rat—large round ears and tapered muzzle; cat—tall triangular ears; dog—long floppy ears; wolf—long pointed ears and angular cheek tufts; leopard—small round ears and sparse large rosettes; lion—large scalloped mane. Tiger and elephant reuse the selected anchors.

Terrain: green/red arched dens with a white cross window and flanking grass; open gray trap with white teeth, orange bait, and flanking grass; extremely subtle sparse green/red/orange ground marks; extremely subtle cyan water waves and bubbles without banks or borders; side-lying big-headed crocodile with top-mounted eyes; compact lily pad and lotus.

Transparency workflow: prompts requested a flat `#00ff00` key (or `#ff00ff` for green subjects). The built-in generator returned the keyed area already removed as alpha. The local helper was attempted but its Pillow dependency was unavailable, so the already-transparent generated files were retained after RGBA and transparent-corner validation.
