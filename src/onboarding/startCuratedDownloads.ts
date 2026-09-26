import { DownloadableModel } from '../components/model/DownloadableModelItem';
import { modelDownloader } from '../services/ModelDownloader';
import { huggingFaceService } from '../services/HuggingFaceService';
import { StoredModel } from '../services/ModelDownloaderTypes';

function mainFilename(model: DownloadableModel): string {
  return model.huggingFaceLink.split('/').pop() || model.name;
}

function normalizeName(name: string): string {
  return name.replace(/\.(gguf|bin|litertlm|task)$/i, '').toLowerCase();
}

function isStored(storedModels: StoredModel[], filename: string): boolean {
  const check = normalizeName(filename);
  return storedModels.some((stored) => normalizeName(stored.name) === check);
}

async function downloadFile(url: string, filename: string): Promise<void> {
  await modelDownloader.downloadModel(
    url,
    filename,
    huggingFaceService.getAccessToken(),
  );
}

/**
 * Starts curated downloads without navigating to the Downloads screen.
 * Skips files that are already on device. Returns how many models had at least one new download started.
 */
export async function startCuratedDownloads(
  models: DownloadableModel[],
): Promise<number> {
  const storedModels = await modelDownloader.getStoredModels();
  let modelsStarted = 0;

  for (const model of models) {
    const main = mainFilename(model);
    if (isStored(storedModels, main)) {
      continue;
    }

    const files: { url: string; filename: string }[] = [
      { url: model.huggingFaceLink, filename: main },
    ];

    if (model.additionalFiles?.length) {
      model.additionalFiles.forEach((file) => {
        files.push({
          url: file.url,
          filename: file.url.split('/').pop() || file.name,
        });
      });
    }

    let startedAny = false;
    for (const file of files) {
      if (isStored(storedModels, file.filename)) {
        continue;
      }
      try {
        await downloadFile(file.url, file.filename);
        startedAny = true;
      } catch {
        // continue with other files / models
      }
    }

    if (startedAny) {
      modelsStarted += 1;
    }
  }

  return modelsStarted;
}
