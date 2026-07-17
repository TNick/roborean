.PHONY: init init-d test lint delint pre-commit conformance test-storage conformance-documents api web platform openapi openapi-check e2e e2e-discover e2e-run e2e-repair e2e-doctor parity-dryrun

ifeq ($(OS),Windows_NT)
PYTHON = venv/Scripts/python.exe
PIP = venv/Scripts/pip.exe
else
PYTHON = venv/bin/python
PIP = venv/bin/pip
endif

E2E_AI_PATH ?= D:/prog/__py_libs__/e2e-ai

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
	packages/python/roborean_engine \
	packages/python/roborean_api_fastapi

init:
	python -m venv venv
	$(PIP) install --isolated --index-url https://pypi.org/simple/ \
		$(foreach pkg,$(PY_PACKAGES),-e $(pkg))
	pnpm install --registry https://registry.npmjs.org/

init-d: init
	$(PIP) install --isolated --index-url https://pypi.org/simple/ \
		-e "packages/python/roborean_engine[dev]" \
		-e packages/python/roborean_api_fastapi \
		-e apps/api \
		pytest black isort flake8 pre-commit PyYAML SQLAlchemy httpx \
		openpyxl defusedxml python-docx docxtpl Pillow ezdxf \
		"uvicorn[standard]"
	$(PYTHON) tools/install_e2e_ai.py
	$(PYTHON) -m pre_commit install

api:
	$(PYTHON) -m uvicorn roborean_api_app.main:build --factory --reload --port 8000

web:
	pnpm --filter web dev

platform:
	@echo "Run make api and make web in separate terminals"

openapi:
	$(PYTHON) tools/export_openapi.py
	pnpm --filter @roborean/api-types run generate

openapi-check:
	$(PYTHON) tools/check_openapi_drift.py

parity-dryrun:
	$(PYTHON) tools/compare_dryrun_parity.py

e2e:
	$(PYTHON) -m e2e_ai verify --no-start-runtime

e2e-discover:
	$(PYTHON) -m e2e_ai discover

e2e-run:
	$(PYTHON) -m e2e_ai run --all --no-start-runtime

e2e-repair:
	$(PYTHON) -m e2e_ai repair --no-start-runtime

e2e-doctor:
	$(PYTHON) -m e2e_ai doctor

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

# Autofix format (Python Black/isort + TypeScript/JS Prettier).
delint:
	$(PYTHON) -m black packages/python tools
	$(PYTHON) -m isort packages/python tools
	pnpm run format

# Run every pre-commit hook on the tree (formatters fix; flake8 checks).
# Autofix hooks exit 1 when they rewrite files; run twice so a clean tree
# ends with exit 0 after the first pass applies fixes.
pre-commit:
	-$(PYTHON) -m pre_commit run --all-files
	$(PYTHON) -m pre_commit run --all-files

conformance:
	$(PYTHON) tools/run_conformance.py

conformance-documents:
	$(PYTHON) tools/run_document_conformance.py
