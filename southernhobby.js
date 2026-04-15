const express = require("express");
const { chromium } = require("playwright");
const axios = require("axios");

const app = express();
app.use(express.json());

const EMAIL = "topstarsalesllc@gmail.com";
const PASSWORD = "captain52";

app.get("/run-southern", async (req, res) => {
    let browser;

    try {
        browser = await chromium.launch({ headless: true });
        // browser = await chromium.launch({
        //     headless: false,
        //     slowMo: 200   // optional: slows actions so you can see them
        // });
        const context = await browser.newContext();
        const page = await context.newPage();

        console.log("Opening spreadsheet page...");
        await page.goto("https://www.southernhobby.com/product_spreadsheet.php", {
            waitUntil: "domcontentloaded"
        });

        // Check if login page is shown
        const emailField = await page.$('input[name="email_address"]');

        if (emailField) {
            console.log("Login required. Logging in...");

            await page.fill('input[name="email_address"]', EMAIL);
            await page.fill('input[name="password"]', PASSWORD);

            await Promise.all([
                page.waitForNavigation(),
                page.click('input[name="login"]')
            ]);

            console.log("Logged in successfully.");
        }

        // Now check for download link
        await page.waitForTimeout(2000);

        const linkElement = await page.$("#link");

        if (!linkElement) {
            throw new Error("Download link not found after login.");
        }

        const hrefValue = await linkElement.getAttribute("href");

        if (!hrefValue) {
            throw new Error("Download link has no href.");
        }

        console.log("Found href:", hrefValue);

        // Extract filename from javascript:download('spreadsheet/FILE.xlsx')
        const match = hrefValue.match(/download\('(.+?)'\)/);

        if (!match) {
            throw new Error("Could not extract filename.");
        }

        const fullPath = match[1];
        const fileName = fullPath.split("/").pop();

        console.log("Extracted file name:", fileName);

        // Send to external API
        const apiResponse = await axios.post(
            "https://codewithninja.com/southern.php",
            new URLSearchParams({
                FileName: fileName
            }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            }
        );

        console.log("API Response:", apiResponse.data);

        res.json({
            success: true,
            fileName,
            apiResponse: apiResponse.data
        });

    } catch (error) {
        console.error("Error:", error.message);

        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

app.listen(3000, () => {
    console.log(`Server running on port ${PORT}`);
});