#include "mainwindow.h"
#include "ui_mainwindow.h"

MainWindow::MainWindow(QWidget *parent) :
    QMainWindow(parent),
    ui(new Ui::MainWindow)
{
    ui->setupUi(this);

    this->oClipboard = QApplication::clipboard();

    this->sConfigFilePath = QDir::homePath()+"/appSharedClipboard.json";

    if (QFile::exists(this->sConfigFilePath)) {
        QFile oConfigFile(this->sConfigFilePath);

        if (oConfigFile.open(QIODevice::ReadOnly)) {
            this->oConfigJsonDocument = QJsonDocument::fromJson(oConfigFile.readAll());

            this->oConfigJsonObject = this->oConfigJsonDocument.object();
        }

        oConfigFile.close();
    }

    this->iPort = this->oConfigJsonObject["iPort"].toInt();

    if (this->iPort<1 || this->iPort>65535) {
        this->iPort = 45500;
    }

    ui->oPortLineEdit->setText(QString::number(this->iPort));

    this->setWindowTitle("appSharedClipboard");

    QIcon oIcon(":/images/buffer_icon.png");

    this->setWindowIcon(oIcon);

    this->oTrayMenu = QSharedPointer<QMenu>::create(this);
    QAction *oShowHideAction = this->oTrayMenu->addAction("Show/Hide");
    connect(oShowHideAction, &QAction::triggered, this, &MainWindow::fnShowHide);

    this->oTrayMenu->addSeparator();

    QAction *oQuitAction = this->oTrayMenu->addAction("Quit");
    connect(oQuitAction, &QAction::triggered, this, &MainWindow::fnQuit);

    this->oTrayIcon = QSharedPointer<QSystemTrayIcon>::create(this);
    this->oTrayIcon->setIcon(oIcon);
    this->oTrayIcon->setContextMenu(this->oTrayMenu.data());

    connect(this->oTrayIcon.data(), &QSystemTrayIcon::activated, this, &MainWindow::fnIconActivated);

    this->oTrayIcon->show();

    connect(&this->oRecieverUdpSocket, &QUdpSocket::readyRead, this, &MainWindow::fnReadSignal);

    connect(this->oClipboard, &QClipboard::changed, this, &MainWindow::fnClipboardChanged);
    connect(this->oClipboard, &QClipboard::dataChanged, this, &MainWindow::fnClipboardDataChanged);

    this->fnListen();
}

MainWindow::~MainWindow()
{
    delete ui;
}

void MainWindow::fnClipboardChanged(QClipboard::Mode eMode)
{
    qDebug() << "fnClipboardChanged";
}

void MainWindow::fnClipboardDataChanged()
{
    qDebug() << "fnClipboardDataChanged";

    QByteArray oDatagram;
    QByteArray oBuffer;
    const QMimeData *oMimeData = this->oClipboard->mimeData();

    if (oMimeData->hasText()) {
        oDatagram.append(CliboardType::CB_TEXT);
        oBuffer = oMimeData->text().toUtf8();
    } else if(oMimeData->hasHtml()) {
        oDatagram.append(CliboardType::CB_HTML);
        oBuffer = oMimeData->html().toUtf8();
    } else if(oMimeData->hasImage()) {
        oDatagram.append(CliboardType::CB_IMAGE);
        oBuffer = oMimeData->imageData().toByteArray();
    }

    oDatagram.append(oBuffer);

    this->oSenderUdpSocket.writeDatagram(oDatagram, QHostAddress::Broadcast, this->iPort);
    qDebug() << "this->oSenderUdpSocket.writeDatagram(oDatagram, QHostAddress::Broadcast, this->iPort);";
}

void MainWindow::fnListen()
{
    qDebug() << "fnReadSignal";
    this->oRecieverUdpSocket.bind(static_cast<quint16>(this->iPort), QUdpSocket::ShareAddress);
}

void MainWindow::fnReadSignal()
{
    qDebug() << "fnReadSignal";

    QByteArray oDatagramByteArray;

    while (this->oRecieverUdpSocket.hasPendingDatagrams()) {
        oDatagramByteArray.resize(int(this->oRecieverUdpSocket.pendingDatagramSize()));
        this->oRecieverUdpSocket.readDatagram(oDatagramByteArray.data(), oDatagramByteArray.size());

        qDebug() << "readDatagram" << oDatagramByteArray.size();

        qint8 iType = oDatagramByteArray.at(0);

        oDatagramByteArray.remove(0, 1);

        qDebug() << "Type:" << iType << "Size:" <<  oDatagramByteArray.size();

        if (iType == CliboardType::CB_TEXT) {
            this->oMimeData.setText(oDatagramByteArray);
        } else if (iType == CliboardType::CB_HTML) {
            this->oMimeData.setHtml(oDatagramByteArray);
        } else if (iType == CliboardType::CB_IMAGE) {
            this->oMimeData.setImageData(oDatagramByteArray);
        }

        this->oClipboard->setMimeData(&this->oMimeData);
    }
}

void MainWindow::fnCloseEvent(QCloseEvent *oEvent)
{
#ifdef Q_OS_OSX
    if (!oEvent->spontaneous() || !isVisible()) {
        return;
    }
#endif
    if (this->oTrayIcon->isVisible()) {
        hide();
        oEvent->ignore();
    }
}

void MainWindow::fnShowHide()
{
    this->setHidden(!this->isHidden());
}

void MainWindow::fnQuit()
{
    QApplication::quit();
}

void MainWindow::fnIconActivated(QSystemTrayIcon::ActivationReason eReason)
{
    switch (eReason) {
        case QSystemTrayIcon::Trigger:
        //case QSystemTrayIcon::DoubleClick:
            //this->fnShowHide();
            break;
        case QSystemTrayIcon::MiddleClick:
            break;
    }
}

void MainWindow::on_oSaveButton_clicked()
{
    this->iPort = ui->oPortLineEdit->text().toInt();

    this->fnListen();

    QFile oConfigFile(this->sConfigFilePath);

    if (oConfigFile.open(QIODevice::WriteOnly)) {
        this->oConfigJsonObject["iPort"] = this->iPort;

        this->oConfigJsonDocument.setObject(this->oConfigJsonObject);

        oConfigFile.write(this->oConfigJsonDocument.toJson());
    }

    oConfigFile.close();
}
