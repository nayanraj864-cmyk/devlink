import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { ImageCropUploadModal } from "@/components/shared/ImageCropUploadModal";

vi.mock("@/services/imageUpload", () => ({
  uploadImage: vi.fn().mockResolvedValue("https://example.test/avatar.webp"),
}));

/**
 * Regression tests for #1347.
 *
 * The reset effect called setZoom / setRotation / setPanX / setPanY, which are
 * ImageCropper's state, not this component's. The effect is guarded on
 * `!isOpen`, and a modal is rendered closed before it is opened, so the throw
 * happened on mount -- `ReferenceError: setZoom is not defined` -- and took the
 * surrounding subtree with it. Avatar and banner upload were both unusable.
 */
describe("ImageCropUploadModal", () => {
  it("mounts closed without throwing", () => {
    expect(() =>
      render(
        <ImageCropUploadModal
          isOpen={false}
          onClose={() => {}}
          onUploadSuccess={() => {}}
          mode="avatar"
        />,
      ),
    ).not.toThrow();
  });

  it("mounts closed without throwing in banner mode", () => {
    expect(() =>
      render(
        <ImageCropUploadModal
          isOpen={false}
          onClose={() => {}}
          onUploadSuccess={() => {}}
          mode="banner"
        />,
      ),
    ).not.toThrow();
  });

  it("renders its title once opened", () => {
    render(
      <ImageCropUploadModal isOpen onClose={() => {}} onUploadSuccess={() => {}} mode="avatar" />,
    );

    expect(screen.getByText("Upload Avatar Image")).toBeInTheDocument();
  });

  it("survives being closed again after opening, which is when the effect reruns", () => {
    const { rerender } = render(
      <ImageCropUploadModal isOpen onClose={() => {}} onUploadSuccess={() => {}} mode="avatar" />,
    );

    expect(() =>
      rerender(
        <ImageCropUploadModal
          isOpen={false}
          onClose={() => {}}
          onUploadSuccess={() => {}}
          mode="avatar"
        />,
      ),
    ).not.toThrow();
  });
});
