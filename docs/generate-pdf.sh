
#!/bin/bash

# To generate a pdf, install pandoc.
#
# Before generating a pdf:
#
# 1. Remove the intro section (marked with "only for github, remove if creating a pdf" comments).
# 2. Comment github tables, uncomment pdf tables.

pandoc dex-specification.md \
    --standalone \
    --toc \
    --shift-heading-level-by=-1 \
    --include-before-body intro.md \
    --verbose \
    --include-in-header inline_code.tex \
    -V geometry:a4paper \
    -V geometry:margin=2cm \
    -V mainfont="Sora" \
    -V monofont="Sora Mono" \
    -V block-headings \
    -o dex-specification.pdf
