---
layout: post
title: "Use pre-commit to save time and avoid mistakes"
---

# Why use pre-commit
I'm working in a team of data scientists, and most of us don't have a "proper" software background. Most here have some sort of natural sciences education and have picked up machine learning and software development along the way.
This means that we don't have the same software craftmanship foundation to build from when our ML models need to grow, scale, and change. 

There is a lot of ways to improve in this area, but a simple one to implement for a whole team in one go is to require `pre-commit` installed in all projects. This is a tool that lets you define a set of checks that are performed on your code every time you make a commit in git (you are using git, right?).

## Installation
Make (or copy from [below](#full-setup)) a file called  `.pre-commit-config.yaml` and place it in the root of your repository. 
Then
```shell
pip install pre-commit
pre-commit install
```
## Run
Every time you `git commit` the hooks you have defined in `.pre-commit-config.yaml` will be run *on the changed files*. 

If for some reason you want to run the hooks on *all files* (for instance in your CI/CD) pipeline, you can do
```shell
pre-commit run --all-files
```

# Individual checks
## Stop dealing with whitespace diffs in your PRs
```yaml
-   repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v3.2.0
    hooks:
    -   id: end-of-file-fixer
    -   id: trailing-whitespace
-   repo: https://github.com/pycqa/isort
    rev: 5.8.0
    hooks:
    - id: isort
      name: isort
```
The two first hooks fixes small whitespace mistakes. Each file should end with just a newline, and there should be no whitespace at the end of a line.

[`isort`](https://pycqa.github.io/isort/) sorts your import statements. It is a minor thing, but it will group imports into 3 groups: 
1) Included in Python stdlib.
2) Third party library.
3) Local code. 

There is some setup needed to make it compatible with `black`. See [Full setup](#full-setup) for details.

## You probably committed this by mistake
```yaml
-   repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v3.2.0
    hooks:
    -   id: check-ast
    -   id: check-json
    -   id: check-yaml
    -   id: debug-statements
    -   id: detect-aws-credentials
        args: [--allow-missing-credentials]
    -   id: detect-private-key
    -   id: check-merge-conflict
    -   id: check-added-large-files
        args: ['--maxkb=3000']
```
Here is a bunch of hooks that will 

- Check if your Python code is valid (avoiding those `SyntaxError`s that sometimes crop up)
- Check that json and yaml files can be parsed
- Check that you don't have any leftover `breakpoint()` statements from a debugging session.
- Check that you haven't accidentally committed secrets.
- Check that you haven't committed an unresolved merge conflict, like leaving 
  ```
  >>>>>>>>>>>>>>>>>>>>>> HEAD
  ``` 
  in the file. 
- Check that you haven't committed an unusally large file. If you *actually* need large files inside your repo, use [git-lfs](https://git-lfs.github.com/).

## Make Jupyter Notebook diffs easier to deal with

```yaml
-   repo: https://github.com/kynan/nbstripout
    rev: 0.5.0
    hooks:
    - id: nbstripout
```

[`nbstripout`](https://github.com/kynan/nbstripout) is very useful if you commit a lot of Jupyter Notebooks to your repo. The output cells are saved in the file, so if you are outputting some large plots, each notebook can become quite big. 
If your notebooks are not just one-off explorations, but you come back to them more than once, this will make the PR diffs much easier to read. 

If that is NOT the case, maybe you don't want or need this one. 

## Stop arguing over code style
```yaml
-   repo: https://github.com/psf/black
    rev: 21.7b0
    hooks:
    -   id: black
-   repo: https://gitlab.com/pycqa/flake8
    rev: 3.7.9
    hooks:
    - id: flake8
```
[`black`](https://black.readthedocs.io/en/stable/) is a code autoformatter. It has opinions on what is good style and bad, and I mostly agree with those opinions. The *very* cool thing about `black` is that it does not just find instances where you are not following the style, it can automatically fix your code to follow the style.

[`flake8`](https://flake8.pycqa.org/en/latest/) is a linter. It can check more kinds style errors, but it will not fix anything. It can only complain. This is mostly fine, because it is often trivial to fix the issues that `flake8` raises. 

Both of these tools needs some config to work as desired. See [Full setup](#full-setup) for details.

## Optional static type checking
```yaml
-   repo: https://github.com/pre-commit/mirrors-mypy
    rev: v0.782
    hooks:
    -   id: mypy
        args: [--ignore-missing-imports]
```
You can optionally do static typing in Python now. 
[`mypy`](http://mypy-lang.org/) is a tool to run static analysis on your python files and it will complain if you are inputting or return types that don't match your typehints. 

# Full setup
If you just want to copy my setup, add these three files to the root of your repo:
## `.pre-commit-config.yaml`:
```yaml
repos:
-   repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v3.2.0
    hooks:
    -   id: check-ast
    -   id: check-json
    -   id: check-yaml
    -   id: debug-statements
    -   id: detect-aws-credentials
        args: [--allow-missing-credentials]
    -   id: detect-private-key
    -   id: check-merge-conflict
    -   id: check-added-large-files
        args: ['--maxkb=3000']
-   repo: https://github.com/pre-commit/mirrors-mypy
    rev: v0.782
    hooks:
    -   id: mypy
        args: [--ignore-missing-imports]
-   repo: https://github.com/pycqa/isort
    rev: 5.8.0
    hooks:
    - id: isort
      name: isort
-   repo: https://github.com/psf/black
    rev: 21.7b0
    hooks:
    -   id: black
-   repo: https://gitlab.com/pycqa/flake8
    rev: 3.7.9
    hooks:
    - id: flake8
-   repo: https://github.com/kynan/nbstripout
    rev: 0.5.0
    hooks:
    - id: nbstripout
```

## `pyproject.toml`:
```toml
[tool.black]
line-length = 100
include = '\.pyi?$'
exclude = '''
/(
    \.git
  | \.hg
  | \.mypy_cache
  | \.tox
  | \.venv
  | _build
  | buck-out
  | build
  | dist
)/
'''

[tool.isort]
profile = "black"
line_length = 100
```

## `.flake8`
```toml
[flake8]
ignore = E203, E266, E501, W503
max-line-length = 100
max-complexity = 18
select = B,C,E,F,W,T4,B9
```
