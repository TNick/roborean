.PHONY: init init-d test lint delint conformance test-storage conformance-documents

PYTHON = venv/Scripts/python.exe
PIP = venv/Scripts/pip.exe

PY_PACKAGES = \
	packages/python/roborean_spec \
	packages/python/roborean_storage_base \
	packages/python/roborean_storage_dict \
	packages/python/roborean_storage_sqlalchemy \
	packages/python/roborean_plugins_base \
	packages/python/roborean_documents_base \
	packages/python/roborean_documents_text \
	packages/python/roborean_documents_markdown \
	packages/python/roborean_documents_xlsx \
	packages/python/roborean_documents_docx \
	packages/python/roborean_documents_image \
	packages/python/roborean_documents_dxf \
	packages/python/roborean_engine

init:
	python -m venv venv
	$(PIP) install --isolated --index-url https://pypi.org/simple/ \
		$(foreach pkg,$(PY_PACKAGES),-e $(pkg))
	pnpm install --registry https://registry.npmjs.org/

init-d: init
	$(PIP) install --isolated --index-url https://pypi.org/simple/ \
		-e "packages/python/roborean_engine[dev]" \
		pytest black isort flake8 PyYAML SQLAlchemy \
		openpyxl defusedxml python-docx docxtpl Pillow ezdxf

test:
	$(PYTHON) -m pytest packages/python -q
	pnpm run build
	pnpm -r test

test-storage:
	$(PYTHON) -m pytest -q -m integration packages/python

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

conformance-documents:
	$(PYTHON) tools/run_document_conformance.py
