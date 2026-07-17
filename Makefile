.PHONY: init init-d test lint delint conformance

PYTHON = venv/Scripts/python.exe
PIP = venv/Scripts/pip.exe

init:
	python -m venv venv
	$(PIP) install --isolated --index-url https://pypi.org/simple/ -e packages/python/roborean_spec -e packages/python/roborean_engine
	pnpm install --registry https://registry.npmjs.org/

init-d: init
	$(PIP) install --isolated --index-url https://pypi.org/simple/ -e "packages/python/roborean_engine[dev]" pytest black isort flake8

test:
	$(PYTHON) -m pytest packages/python -q
	pnpm run build
	pnpm -r test

lint:
	$(PYTHON) -m black --check packages/python tools
	$(PYTHON) -m isort --check-only packages/python tools
	$(PYTHON) -m flake8 packages/python tools
	pnpm run lint

delint:
	$(PYTHON) -m black packages/python tools
	$(PYTHON) -m isort packages/python tools

conformance:
	$(PYTHON) tools/run_conformance.py
