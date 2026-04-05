# How to serve this site locally for testing

```sh
just install
just docs_serve
```

# SSE Explorer

The [SSE Explorer page](https://kplauritzen.dk/sse-explorer/) uses WASM built from the [sse-rust](../sse-rust/) project. The WASM files in `docs/wasm/` are committed directly and updated manually after rebuilding sse-rust:

```sh
cd ../sse-rust
wasm-pack build --target web
cp pkg/sse_core.js pkg/sse_core_bg.wasm ../kplauritzen.github.io/docs/wasm/
```

# How to create a new post

Add a markdown file with a `date` tag to `docs/posts`
