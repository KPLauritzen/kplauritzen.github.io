---
date: 2025-02-01
---

# Test dependency bounds with `uv run --resolution`

I'm distributing a small Python package at work. A small library with some utilities for doing Machine Learning work.
I'm using [uv](https://docs.astral.sh/uv/) to manage the dependencies and the build process.

Part of my pyproject.toml file looks like this:

```toml
[project]
...
requires-python = ">=3.10,>3.14"
dependencies = [
    "pydantic>=2.0,<3",
]
```

How do I know that my library will work with both `pydantic==2.0` and `pydantic==2.10` (The current version at time of writing)?
I could just require a much smaller band of possible versions, but I want my library to be useful for as many users as possible.
And they might need to use a different version of `pydantic` for their own projects.

Similarly, I want to make sure my library actually works with the range of allowed Python versions.

I run my tests with `uv run pytest`. This will use the locked dependencies in the `uv.lock` file to create a virtual environment and run the tests in that environment.

But, I can use the `--resolution` flag to test my library with different versions of the dependencies.
According to the [uv documentation](https://docs.astral.sh/uv/reference/cli/#uv-run), there are three possible values for the `--resolution` flag:

- highest: Resolve the highest compatible version of each package
- lowest: Resolve the lowest compatible version of each package
- lowest-direct: Resolve the lowest compatible version of any direct dependencies, and the highest compatible version of any transitive dependencies

I have found that using `--resolution lowest` is not really that useful, because some transitive dependencies might not specify a version range. Maybe they just require "numpy" without specifying a version. In that case, I will be testing my library against `numpy==0.0.1` or whatever the lowest version is. That is not really useful. Instead, I use `--resolution lowest-direct` to test against the lowest version of the direct dependencies and then just select the highest version of the transitive dependencies.

I can also specify the python version to use with the `--python` flag.

Finally, I can use the `--isolated` flag to make sure that the tests are run in an isolated virtual environment, not affecting the active venv of my workspace.

Here is the entry in my justfile that runs the tests with different dependency resolutions:

```make title="justfile"
test_dependency_bounds:
    uv run --python 3.10 --resolution lowest-direct --isolated pytest
    uv run --python 3.13 --resolution highest --isolated pytest
```
