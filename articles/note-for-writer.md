# Note for Writer

If you are a community member or contributor, you can skip this note and are free to publish your own articles explaining the package to others **without needing to follow these constraints**.

If you are the maintainer of the articles page of this repository and you are sure that you need to write an article to explain something, please read **this before you start writing**:

## Dev.to markdown rendering

The use of the `{% details ...%}` syntax instead of the native details tag for markdown is because of dev.to's unique rendering

## Avoid these traps

1. **Do not summarize the README into an article.**
   A "README in article form" only acts as reformatted documentation and is redundant.

2. **Do not farm the README for articles.**
   The non-flagship README examples are miscellaneous uses of primitives the articles already teach.
   Spinning them into posts just re-teaches the same ideas in different costumes.


## The division of labor

- **Articles are for discovery.** One thesis each, full narrative, aimed at a
  reader who doesn't know the package yet.

  A new article should introduce a thesis that doesn't already exist in the series that comes from:

  - A **new feature** worth narrating, or
  - A **build-something-real framing** (e.g., "building a call-graph profiler
    with fn-monitor") rather than "here's another API demo."

- **The README is for reference.** It answers "what else can it do?" for readers
  the articles already pulled in. For reference purposes, the README may contain code that an article already explains, but it should explicitly point to the articles for the explanations.
  

## When to create a dedicated documentation site

Do not build a docs site until one of these conditions are met:

- The API outgrows the README (many exports, plugin systems, config matrices).
- The package needs versioned docs across multiple majors.
- Another package is shipped and needs a unified brand hub.

Until then, the README *is* the docs site — for humans and for LLMs.