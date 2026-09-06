using System;
using System.IO;
using System.Threading;
using System.Runtime.InteropServices;
using System.Drawing;
using System.Drawing.Imaging;

namespace ScreenshotNative {
    public class WinCapture {
        [DllImport("user32.dll")]
        public static extern bool SetProcessDPIAware();

        [DllImport("user32.dll", SetLastError = true)]
        public static extern IntPtr OpenInputDesktop(uint dwFlags, bool fInherit, uint dwDesiredAccess);

        [DllImport("user32.dll", SetLastError = true)]
        public static extern bool SetThreadDesktop(IntPtr hDesktop);

        [DllImport("user32.dll", SetLastError = true)]
        public static extern bool CloseDesktop(IntPtr hDesktop);

        [DllImport("user32.dll", SetLastError = true)]
        public static extern IntPtr GetDC(IntPtr hWnd);

        [DllImport("user32.dll", SetLastError = true)]
        public static extern int ReleaseDC(IntPtr hWnd, IntPtr hDC);

        [DllImport("gdi32.dll", SetLastError = true)]
        public static extern IntPtr CreateCompatibleDC(IntPtr hDC);

        [DllImport("gdi32.dll", SetLastError = true)]
        public static extern IntPtr CreateCompatibleBitmap(IntPtr hDC, int nWidth, int nHeight);

        [DllImport("gdi32.dll", SetLastError = true)]
        public static extern IntPtr SelectObject(IntPtr hDC, IntPtr hObject);

        [DllImport("gdi32.dll", SetLastError = true)]
        public static extern bool BitBlt(IntPtr hObject, int nXDest, int nYDest, int nWidth, int nHeight, IntPtr hObjSource, int nXSrc, int nYSrc, int dwRop);

        [DllImport("gdi32.dll", SetLastError = true)]
        public static extern bool DeleteDC(IntPtr hDC);

        [DllImport("gdi32.dll", SetLastError = true)]
        public static extern bool DeleteObject(IntPtr hObject);

        [DllImport("user32.dll")]
        public static extern int GetSystemMetrics(int nIndex);

        public const int SRCCOPY = 0x00CC0020;
        public const int SM_XVIRTUALSCREEN = 76;
        public const int SM_YVIRTUALSCREEN = 77;
        public const int SM_CXVIRTUALSCREEN = 78;
        public const int SM_CYVIRTUALSCREEN = 79;
        public const int SM_CXSCREEN = 0;
        public const int SM_CYSCREEN = 1;

        public static int Main(string[] args) {
            try {
                // 开启高 DPI 支持，获取物理像素真实分辨率
                SetProcessDPIAware();

                int x = 0;
                int y = 0;
                int w = 0;
                int h = 0;
                string outFile = null;

                if (args.Length >= 4) {
                    int.TryParse(args[0], out x);
                    int.TryParse(args[1], out y);
                    int.TryParse(args[2], out w);
                    int.TryParse(args[3], out h);
                    if (args.Length >= 5) {
                        outFile = args[4];
                    }
                } else if (args.Length == 1) {
                    outFile = args[0];
                }

                byte[] pngBytes = null;
                bool success = false;
                Exception threadEx = null;

                Thread worker = new Thread(() => {
                    IntPtr hDesk = IntPtr.Zero;
                    try {
                        hDesk = OpenInputDesktop(0, false, 0x01FF);
                        if (hDesk != IntPtr.Zero) {
                            SetThreadDesktop(hDesk);
                        }

                        if (w <= 0 || h <= 0) {
                            x = GetSystemMetrics(SM_XVIRTUALSCREEN);
                            y = GetSystemMetrics(SM_YVIRTUALSCREEN);
                            w = GetSystemMetrics(SM_CXVIRTUALSCREEN);
                            h = GetSystemMetrics(SM_CYVIRTUALSCREEN);
                            if (w <= 0 || h <= 0) {
                                w = GetSystemMetrics(SM_CXSCREEN);
                                h = GetSystemMetrics(SM_CYSCREEN);
                            }
                        }

                        IntPtr hScreenDC = GetDC(IntPtr.Zero);
                        if (hScreenDC == IntPtr.Zero) {
                            throw new Exception("GetDC(IntPtr.Zero) returned null");
                        }

                        IntPtr hMemoryDC = CreateCompatibleDC(hScreenDC);
                        IntPtr hBitmap = CreateCompatibleBitmap(hScreenDC, w, h);
                        IntPtr hOldBitmap = SelectObject(hMemoryDC, hBitmap);

                        bool blt = BitBlt(hMemoryDC, 0, 0, w, h, hScreenDC, x, y, SRCCOPY);
                        if (!blt) {
                            int err = Marshal.GetLastWin32Error();
                            throw new Exception(string.Format("BitBlt failed with code {0}", err));
                        }

                        using (Bitmap bmp = Image.FromHbitmap(hBitmap)) {
                            using (MemoryStream ms = new MemoryStream()) {
                                bmp.Save(ms, ImageFormat.Png);
                                pngBytes = ms.ToArray();
                                success = true;
                            }
                        }

                        SelectObject(hMemoryDC, hOldBitmap);
                        DeleteObject(hBitmap);
                        DeleteDC(hMemoryDC);
                        ReleaseDC(IntPtr.Zero, hScreenDC);
                    } catch (Exception ex) {
                        threadEx = ex;
                    } finally {
                        if (hDesk != IntPtr.Zero) {
                            CloseDesktop(hDesk);
                        }
                    }
                });

                worker.Start();
                worker.Join();

                if (!success || pngBytes == null) {
                    Console.Error.WriteLine(string.Format("Capture failed: {0}", threadEx != null ? threadEx.Message : "Unknown error"));
                    return 1;
                }

                if (!string.IsNullOrEmpty(outFile) && outFile != "-") {
                    File.WriteAllBytes(outFile, pngBytes);
                } else {
                    using (Stream stdout = Console.OpenStandardOutput()) {
                        stdout.Write(pngBytes, 0, pngBytes.Length);
                    }
                }
                return 0;
            } catch (Exception ex) {
                Console.Error.WriteLine(string.Format("Fatal: {0}", ex.Message));
                return 2;
            }
        }
    }
}
